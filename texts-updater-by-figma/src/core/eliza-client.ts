import type { ElizaConfig } from '../types.js';
import { logError, logger } from '../logger.js';
import type { TranslationsMap } from './translation-catalog.js';

const PROMPT_CHUNK_MAX_ENTRIES = 200;
const PROMPT_CHUNK_MAX_LENGTH = 12_000;
const REQUEST_TEMPERATURE = 0.3;

type ElizaMessage = {
  message?: {
    content?: string;
  };
};

interface ElizaResponse {
  choices?: ElizaMessage[];
  response?: {
    choices?: ElizaMessage[];
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

  const logChunkState = (
    entries: Array<readonly [string, string[]]>,
    length: number,
    action: 'flush' | 'append' | 'start-over',
  ) => {
    logger.debug(
      'Eliza chunk %s: entries=%d, promptLength=%d',
      action,
      entries.length,
      length,
    );
  };

  const flush = () => {
    if (currentEntries.length === 0) {
      return;
    }

    logChunkState(currentEntries, currentLength, 'flush');
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
      logChunkState(currentEntries, currentLength, 'start-over');
      if (currentLength >= PROMPT_CHUNK_MAX_LENGTH) {
        logger.warn(
          'Eliza chunk single-entry prompt exceeds max length (%d >= %d). Prompt will be sent as-is.',
          currentLength,
          PROMPT_CHUNK_MAX_LENGTH,
        );
        flush();
      }
      continue;
    }

    currentEntries = candidateEntries;
    currentLength = candidateLength;
    logChunkState(currentEntries, currentLength, 'append');

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
  text(): Promise<string>;
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
    temperature: REQUEST_TEMPERATURE,
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

    logger.debug('Eliza lookup started: text="%s" (len=%d)', oldText, oldText.length);
    logger.debug(
      'Eliza configured with endpoint=%s, model=%s. Translation chunks=%d',
      endpoint,
      model,
      chunks.length,
    );

    for (const [index, chunk] of chunks.entries()) {
      const prompt = buildPrompt(oldText, chunk);
      logger.debug(
        'Eliza chunk #%d/%d prompt length=%d, entries=%d',
        index + 1,
        chunks.length,
        prompt.length,
        Object.keys(chunk).length,
      );
      const result = await this.sendPrompt({ endpoint, apiKey, model, prompt, chunkIndex: index });

      if (result === null) {
        logger.warn('Eliza chunk #%d returned null, aborting lookup', index + 1);
        return null;
      }

      if (Array.isArray(result) && result.length > 0) {
        logger.success(
          'Eliza chunk #%d returned %d path(s): %s',
          index + 1,
          result.length,
          result.join(', '),
        );
        return result;
      }
    }

    logger.info('Eliza lookup finished without matches');
    return null;
  }

  private async performRequest(
    endpoint: string,
    apiKey: string,
    body: unknown,
  ): Promise<FetchResponse | null> {
    try {
      logger.debug('Eliza request: POST %s', endpoint);
      return (await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })) as FetchResponse;
    } catch (error) {
      logError(error, {
        context: `Сбой запроса к Eliza API: не удалось отправить запрос на ${endpoint}`,
      });
      return null;
    }
  }

  private async sendPrompt(options: {
    endpoint: string;
    apiKey: string;
    model: string;
    prompt: string;
    chunkIndex: number;
  }): Promise<PromptResult> {
    const { endpoint, apiKey, model, prompt, chunkIndex } = options;
    const body = buildRequestBody(model, prompt);
    logger.debug('Eliza chunk #%d request body: %o', chunkIndex + 1, {
      ...body,
      messages: body.messages.map((message) => ({ ...message, content: '<omitted>' })),
    });
    const response = await this.performRequest(endpoint, apiKey, body);

    if (!response) {
      logger.warn('Eliza chunk #%d: запрос не был выполнен', chunkIndex + 1);
      return null;
    }

    if (!response.ok) {
      const errorBody = await response
        .text()
        .then((text) => text)
        .catch((error) => {
          logError(error, {
            context: 'Eliza API: не удалось прочитать тело ошибочного ответа',
          });
          return null;
        });

      logError(new Error(`Ответ ${response.status} ${response.statusText}`), {
        context: `Сбой запроса к Eliza API (chunk #${chunkIndex + 1})`,
      });

      if (errorBody) {
        logger.error('Eliza API error body: %s', errorBody);
      }

      return null;
    }

    let data: ElizaResponse;

    try {
      data = (await response.json()) as ElizaResponse;
      logger.debug('Eliza chunk #%d raw response: %o', chunkIndex + 1, data);
    } catch (error) {
      logError(error, { context: 'Не удалось прочитать ответ Eliza API' });
      return null;
    }

    const content =
      data.response?.choices?.[0]?.message?.content ?? data.choices?.[0]?.message?.content;

    if (!content) {
      logger.info('Eliza chunk #%d: ответ не содержит контента', chunkIndex + 1);
      return undefined;
    }

    try {
      const parsed = JSON.parse(content) as { codePath?: string; codePaths?: unknown };

      if (Array.isArray(parsed.codePaths)) {
        const sanitized = parsed.codePaths
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim());

        if (sanitized.length === 0) {
          logger.info('Eliza chunk #%d: массив путей пустой после фильтрации', chunkIndex + 1);
          return undefined;
        }

        logger.debug('Eliza chunk #%d: получено %d пути(ей)', chunkIndex + 1, sanitized.length);
        return sanitized;
      }

      if (typeof parsed.codePath === 'string') {
        const trimmed = parsed.codePath.trim();

        if (!trimmed || trimmed === 'None') {
          logger.info('Eliza chunk #%d: получен пустой одиночный путь', chunkIndex + 1);
          return undefined;
        }

        logger.debug('Eliza chunk #%d: получен одиночный путь', chunkIndex + 1);
        return [trimmed];
      }

      logger.info('Eliza chunk #%d: ответ не содержит ожидаемых полей', chunkIndex + 1);
      return undefined;
    } catch (error) {
      logError(error, { context: 'Не удалось разобрать ответ Eliza API' });
      return null;
    }
  }
}
