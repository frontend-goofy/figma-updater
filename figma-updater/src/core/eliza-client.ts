import type { ElizaConfig } from '../config/types.js';
import type { TranslationsMap } from './translation-catalog.js';

interface ElizaResponse {
  response?: {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
}

function formatTranslations(translations: TranslationsMap): Record<string, string> {
  const formatted: Record<string, string> = {};

  for (const [text, locations] of Object.entries(translations)) {
    formatted[text] = locations.join(', ');
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

export class ElizaClient {
  constructor(private readonly options: ElizaConfig | undefined) {}

  async findCodePath(oldText: string, translations: TranslationsMap): Promise<string | null> {
    if (!this.options || !this.options.endpoint || !this.options.apiKey || !this.options.model) {
      return null;
    }

    const body = {
      model: this.options.model,
      messages: [
        {
          role: 'user' as const,
          content: buildPrompt(oldText, translations),
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

    const response = await fetch(this.options.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `OAuth ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as ElizaResponse;
    const content = data.response?.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    try {
      const parsed = JSON.parse(content) as { codePath?: string };

      if (!parsed.codePath || parsed.codePath === 'None') {
        return null;
      }

      return parsed.codePath;
    } catch {
      return null;
    }
  }
}
