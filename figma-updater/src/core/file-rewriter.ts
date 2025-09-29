import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { LoadedConfig } from '../config/types.js';
import { logger } from '../logger.js';
import type { DiffMapping } from './types.js';
import { ElizaClient } from './eliza-client.js';
import { TranslationCatalog, type TranslationsMap } from './translation-catalog.js';

async function replaceInFile(filePath: string, oldText: string, newText: string): Promise<boolean> {
  const content = await readFile(filePath, 'utf8');

  if (!content.includes(oldText)) {
    return false;
  }

  const updated = content.replace(oldText, newText);
  await writeFile(filePath, updated, 'utf8');
  return true;
}

function normalizeLocations(locations: string[] | undefined): string[] {
  if (!locations || locations.length === 0) {
    return [];
  }

  return locations.filter(Boolean);
}

function resolvePath(rootDir: string, codePath: string): string {
  const [relativePath] = codePath.split(':');
  return path.resolve(rootDir, relativePath);
}

export interface FileRewriterOptions {
  config: LoadedConfig;
  translations: TranslationCatalog;
  eliza: ElizaClient;
}

export class FileRewriter {
  constructor(private readonly options: FileRewriterOptions) {}

  private async resolveCandidatePaths(oldText: string, translations: TranslationsMap): Promise<string[]> {
    const knownLocations = normalizeLocations(translations[oldText]);

    if (knownLocations.length > 0) {
      return knownLocations;
    }

    const suggested = await this.options.eliza.findCodePath(oldText, translations);

    if (!suggested) {
      return [];
    }

    logger.info(`Eliza API подсказала путь: ${suggested}`);
    return [suggested];
  }

  async applyDiffs(diffs: DiffMapping): Promise<void> {
    let translations: TranslationsMap;

    try {
      translations = await this.options.translations.read();
    } catch (error) {
      logger.error(`Не удалось прочитать файл переводов: ${(error as Error).message}`);
      return;
    }

    for (const pair of diffs) {
      const [oldText, newText] = Object.entries(pair)[0] ?? [];

      if (!oldText || !newText) {
        continue;
      }

      const candidates = await this.resolveCandidatePaths(oldText, translations);

      if (candidates.length === 0) {
        logger.warn(`Не удалось найти путь в переводах для строки: "${oldText}"`);
        continue;
      }

      let applied = false;

      for (const candidate of candidates) {
        const targetPath = resolvePath(this.options.config.rootDir, candidate);

        try {
          const success = await replaceInFile(targetPath, oldText, newText);

          if (success) {
            logger.success(`Файл обновлен: ${targetPath}`);
            applied = true;
            break;
          }
        } catch (error) {
          logger.error(`Ошибка при обновлении файла ${targetPath}: ${(error as Error).message}`);
        }
      }

      if (!applied) {
        logger.warn(`Строка "${oldText}" не найдена в указанных файлах.`);
      }
    }
  }
}
