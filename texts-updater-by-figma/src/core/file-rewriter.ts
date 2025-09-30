import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import levenshtein from 'fast-levenshtein';

import type { LoadedConfig } from '../config/types.js';
import { logError, logger } from '../logger.js';
import type { DiffMapping } from './types.js';
import { ElizaClient } from './eliza-client.js';
import { TranslationCatalog, type TranslationsMap } from './translation-catalog.js';

interface ReplacementCandidate {
  codePath: string;
  searchText: string;
}

const MAX_LEVENSHTEIN_DISTANCE = 4;

async function replaceInFile(filePath: string, searchText: string, newText: string): Promise<boolean> {
  const content = await readFile(filePath, 'utf8');

  if (!content.includes(searchText)) {
    return false;
  }

  const updated = content.replace(searchText, newText);
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

  private async resolveCandidatePaths(
    oldText: string,
    translations: TranslationsMap,
  ): Promise<ReplacementCandidate[]> {
    const knownLocations = normalizeLocations(translations[oldText]);

    if (knownLocations.length > 0) {
      return knownLocations.map((codePath) => ({ codePath, searchText: oldText }));
    }

    const suggested = await this.options.eliza.findCodePaths(oldText, translations);

    if (!suggested || suggested.length === 0) {
      return [];
    }

    const uniqueCandidates = new Map<string, ReplacementCandidate>();

    for (const codePath of suggested) {
      const trimmedPath = codePath.trim();

      if (!trimmedPath) {
        continue;
      }

      let matched = false;

      for (const [text, locations] of Object.entries(translations)) {
        const normalizedLocations = normalizeLocations(locations);

        if (normalizedLocations.includes(trimmedPath)) {
          const key = `${trimmedPath}__${text}`;

          if (!uniqueCandidates.has(key)) {
            uniqueCandidates.set(key, { codePath: trimmedPath, searchText: text });
          }

          matched = true;
        }
      }

      if (!matched) {
        const key = `${trimmedPath}__${oldText}`;

        if (!uniqueCandidates.has(key)) {
          uniqueCandidates.set(key, { codePath: trimmedPath, searchText: oldText });
        }
      }
    }

    const candidates = [...uniqueCandidates.values()];

    const filteredCandidates = candidates.filter((candidate) => {
      if (candidate.searchText === oldText) {
        return true;
      }

      const distance = levenshtein.get(oldText, candidate.searchText);

      return distance <= MAX_LEVENSHTEIN_DISTANCE;
    });

    if (filteredCandidates.length === 0) {
      return [];
    }

    const suggestedPaths = filteredCandidates.map((candidate) => candidate.codePath);

    logger.info(
      `Eliza API подсказала путь${suggestedPaths.length > 1 ? 'и' : ''}: ${suggestedPaths.join(', ')}. Если строка не обновится автоматически, попробуйте сделать это вручную.`,
    );

    return filteredCandidates;
  }

  async applyDiffs(diffs: DiffMapping): Promise<void> {
    let translations: TranslationsMap;

    try {
      translations = await this.options.translations.read();
    } catch (error) {
      logError(error, { context: 'Не удалось прочитать файл переводов' });
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
        const targetPath = resolvePath(this.options.config.rootDir, candidate.codePath);

        try {
          const success = await replaceInFile(targetPath, candidate.searchText, newText);

          if (success) {
            const replacedTextNote =
              candidate.searchText === oldText
                ? ''
                : ` (в файле найдена строка "${candidate.searchText}")`;
            logger.success(
              `Файл обновлен: ${targetPath}. Строка "${oldText}" заменена на "${newText}"${replacedTextNote}.`,
            );
            applied = true;
            break;
          }
        } catch (error) {
          logError(error, { context: `Ошибка при обновлении файла ${targetPath}` });
        }
      }

      if (!applied) {
        const attemptedVariants = Array.from(new Set(candidates.map((candidate) => candidate.searchText)));
        const attemptsList = attemptedVariants.map((variant) => `"${variant}"`).join(', ');
        const suffix = attemptsList ? ` (попытки: ${attemptsList})` : '';
        logger.warn(`Строка "${oldText}" не найдена в указанных файлах.${suffix}`);
      }
    }
  }
}
