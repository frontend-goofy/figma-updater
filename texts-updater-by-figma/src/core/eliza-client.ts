import type { ElizaConfig } from '../types.js';
import { logError } from '../logger.js';
import type { TranslationsMap } from './translation-catalog.js';

const PROMPT_CHUNK_MAX_ENTRIES = 200;
const PROMPT_CHUNK_MAX_LENGTH = 12_000;

interface ElizaResponse {
  response?: {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
}

function normalizeLocations(locations: string[] | undefined): string[] {
  if (!locations || locations.length === 0) {
    return [];
  }

  return locations.filter(Boolean);
}

function formatTranslations(translations: TranslationsMap): Record<string, string> {
  const formatted: Record<string, string> = {};

  for (const [text, locations] of Object.entries(translations)) {
    const normalized = normalizeLocations(locations);

    if (normalized.length === 0) {
      continue;
    }

    formatted[text] = normalized.join(', ');
  }

  return formatted;
}

function buildPrompt(oldText: string, translations: TranslationsMap): string {
  return `You are given a JSON object where each KEY is a localized string and the VALUE lists file references for that string (comma separated, in "path:line" format).

Find the key that best matches "${oldText}". You may ignore differences in punctuation, spaces, dashes and Unicode symbol variants, but reject matches that change the meaning or add extra words.

Return EVERY file reference for the best matching key. If nothing matches, respond with an empty array.

Respond strictly as JSON: {"codePaths": ["<path:line>"]}.

JSON object:
${JSON.stringify(formatTranslations(translations), null, 2)}
`;
}

function buildChunk(entries: Array<readonly [string, string[]]>): TranslationsMap {
  const chunk: TranslationsMap = {};

  for (const [text, locations] of entries) {
    chunk[text] = locations;
  }

  return chunk;
}

function getPromptLength(entries: Array<readonly [string, string[]]>): number {
  if (entries.length === 0) {
    return 0;
  }

  const chunk = buildChunk(entries);
  const formatted = formatTranslations(chunk);

  return JSON.stringify(formatted, null, 2).length;
}

function chunkTranslations(translations: TranslationsMap): TranslationsMap[] {
  const normalizedEntries = Object.entries(translations)
    .map(([text, locations]) => [text, normalizeLocations(locations)] as const)
    .filter(([, locations]) => locations.length > 0);

  if (normalizedEntries.length === 0) {
    return [];
  }

  const chunks: TranslationsMap[] = [];
  let currentEntries: Array<readonly [string, string[]]> = [];
  let currentLength = 0;

  const flush = () => {
    if (currentEntries.length === 0) {
      return;
    }

    chunks.push(buildChunk(currentEntries));
    currentEntries = [];
    currentLength = 0;
  };

  for (const entry of normalizedEntries) {
    const candidateEntries = [...currentEntries, entry];
    const candidateLength = getPromptLength(candidateEntries);

    const exceedsEntryLimit = candidateEntries.length > PROMPT_CHUNK_MAX_ENTRIES;
    const exceedsLengthLimit = candidateLength > PROMPT_CHUNK_MAX_LENGTH;

    if (currentEntries.length > 0 && (exceedsEntryLimit || exceedsLengthLimit)) {
      flush();
      currentEntries = [entry];
      currentLength = getPromptLength(currentEntries);
      if (currentLength >= PROMPT_CHUNK_MAX_LENGTH) {
        flush();
      }
      continue;
    }

    currentEntries = candidateEntries;
    currentLength = candidateLength;

    if (
      currentEntries.length >= PROMPT_CHUNK_MAX_ENTRIES ||
      currentLength >= PROMPT_CHUNK_MAX_LENGTH
    ) {
      flush();
    }
  }

  flush();

  return chunks;
}

type PromptResult = string[] | undefined | null;

interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}

function buildRequestBody(model: string, prompt: string) {
  return {
    model,
    messages: [
      {
        role: 'user' as const,
        content: prompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'code_path_response',
        schema: {
          type: 'object',
          properties: {
            codePaths: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['codePaths'],
          additionalProperties: false,
        },
      },
    },
  };
}

export class ElizaClient {
  constructor(private readonly options: ElizaConfig | undefined) {}

  async findCodePaths(oldText: string, translations: TranslationsMap): Promise<string[] | null> {
    if (!this.options || !this.options.endpoint || !this.options.apiKey || !this.options.model) {
      return null;
    }

    const { endpoint, apiKey, model } = this.options;
    const chunks = chunkTranslations(translations);

    if (chunks.length === 0) {
      return null;
    }

    for (const chunk of chunks) {
      const prompt = buildPrompt(oldText, chunk);
      const result = await this.sendPrompt({ endpoint, apiKey, model, prompt });

      if (result === null) {
        return null;
      }

      if (Array.isArray(result) && result.length > 0) {
        return result;
      }
    }

    return null;
  }

  private async performRequest(
    endpoint: string,
    apiKey: string,
    body: unknown,
  ): Promise<FetchResponse | null> {
    try {
      return (await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })) as FetchResponse;
    } catch (error) {
      logError(error, { context: 'Сбой запроса к Eliza API' });
      return null;
    }
  }

  private async sendPrompt(options: {
    endpoint: string;
    apiKey: string;
    model: string;
    prompt: string;
  }): Promise<PromptResult> {
    const { endpoint, apiKey, model, prompt } = options;
    const body = buildRequestBody(model, prompt);
    const response = await this.performRequest(endpoint, apiKey, body);

    if (!response) {
      return null;
    }

    if (!response.ok) {
      logError(
        new Error(`Ответ ${response.status} ${response.statusText}`),
        { context: 'Сбой запроса к Eliza API' },
      );
      return null;
    }

    let data: ElizaResponse;

    try {
      data = (await response.json()) as ElizaResponse;
    } catch (error) {
      logError(error, { context: 'Не удалось прочитать ответ Eliza API' });
      return null;
    }

    const content = data.response?.choices?.[0]?.message?.content;

    if (!content) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(content) as { codePath?: string; codePaths?: unknown };

      if (Array.isArray(parsed.codePaths)) {
        const sanitized = parsed.codePaths
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim());

        if (sanitized.length === 0) {
          return undefined;
        }

        return sanitized;
      }

      if (typeof parsed.codePath === 'string') {
        const trimmed = parsed.codePath.trim();

        if (!trimmed || trimmed === 'None') {
          return undefined;
        }

        return [trimmed];
      }

      return undefined;
    } catch (error) {
      logError(error, { context: 'Не удалось разобрать ответ Eliza API' });
      return null;
    }
  }
}
