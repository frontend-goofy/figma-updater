import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { LoadedConfig } from '../types.js';

export type TranslationsMap = Record<string, string[]>;

function parsePoString(input: string): string {
  const match = input.match(/"(.*)"/);

  if (!match) {
    return '';
  }

  return match[1].replace(/\\n/g, '\n');
}

export function parsePo(content: string): TranslationsMap {
  const result: TranslationsMap = {};
  const lines = content.split(/\r?\n/);

  let pendingLocations: string[] = [];
  let collecting = false;
  let buffer = '';

  const flush = () => {
    if (!collecting) {
      return;
    }

    if (buffer.length > 0) {
      if (!result[buffer]) {
        result[buffer] = [];
      }

      result[buffer].push(...pendingLocations);
    }

    collecting = false;
    buffer = '';
    pendingLocations = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith('#:')) {
      pendingLocations = line
        .slice(2)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      continue;
    }

    if (line.startsWith('msgid')) {
      flush();
      continue;
    }

    if (line.startsWith('msgstr')) {
      flush();
      collecting = true;
      buffer = parsePoString(line);
      if (!buffer) {
        buffer = '';
      }
      continue;
    }

    if (collecting) {
      if (line.startsWith('"')) {
        buffer += parsePoString(line);
        continue;
      }

      flush();
    }
  }

  flush();

  return result;
}

export async function loadTranslations(config: LoadedConfig): Promise<TranslationsMap> {
  const translationsPath = path.resolve(config.rootDir, config.translations.path);
  const content = await readFile(translationsPath, 'utf8');

  return parsePo(content);
}
