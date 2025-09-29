import type { ElizaConfig } from '../config/types.js';
import { logError } from '../logger.js';
import type { TranslationsMap } from './translation-catalog.js';

const PROMPT_CHUNK_SIZE = 200;

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
  return `Please search through all the string values of the following JSON object and identify the file path where the string "${oldText}" is present.

The JSON maps localized strings to file references. File references use the PO format "path:line" and multiple references can exist for a single string (comma separated).

Rules:
- Match must be exact ignoring punctuation, spaces, dashes or Unicode symbol variants.
- Do not match if additional words are present or the meaning changes.
- Return all exact or relaxed matches. If nothing fits, respond with {"codePath": "None"}.

Respond strictly as JSON: {"codePath": "<value>"}.

JSON object:
${JSON.stringify(formatTranslations(translations), null, 2)}
`;
}

function chunkTranslations(translations: TranslationsMap): TranslationsMap[] {
  const entries = Object.entries(translations)
    .map(([text, locations]) => [text, normalizeLocations(locations)] as const)
    .filter(([, locations]) => locations.length > 0);

  if (entries.length === 0) {
    return [];
  }

  const chunks: TranslationsMap[] = [];

  for (let index = 0; index < entries.length; index += PROMPT_CHUNK_SIZE) {
    const slice = entries.slice(index, index + PROMPT_CHUNK_SIZE);
    const chunk: TranslationsMap = {};

    for (const [text, locations] of slice) {
      chunk[text] = locations;
    }

    chunks.push(chunk);
  }

  return chunks;
}

type PromptResult = string | undefined | null;

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
            codePath: { type: 'string' },
          },
          required: ['codePath'],
          additionalProperties: false,
        },
      },
    },
  };
}

export class ElizaClient {
  constructor(private readonly options: ElizaConfig | undefined) {}

  async findCodePath(oldText: string, translations: TranslationsMap): Promise<string | null> {
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

      if (typeof result === 'string') {
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
      const parsed = JSON.parse(content) as { codePath?: string };

      if (!parsed.codePath || parsed.codePath === 'None') {
        return undefined;
      }

      return parsed.codePath;
    } catch (error) {
      logError(error, { context: 'Не удалось разобрать ответ Eliza API' });
      return null;
    }
  }
}
