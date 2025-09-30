import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { FigmaUpdaterConfig, LoadConfigOptions, LoadedConfig } from './types.js';

export const DEFAULT_TRANSLATIONS_PATH = 'src/locales/ru.po';

export const DEFAULT_CONFIG: FigmaUpdaterConfig = {
  figma: {
    apiUrl: process.env.FIGMA_API_URL ?? 'https://api.figma.com/v1/files/',
    token: process.env.FIGMA_TOKEN ?? null,
  },
  translations: {
    path: DEFAULT_TRANSLATIONS_PATH,
  },
};

async function importConfig(configPath: string): Promise<Partial<FigmaUpdaterConfig> | null> {
  if (!existsSync(configPath)) {
    return null;
  }

  const module = await import(pathToFileURL(configPath).href);
  return (module.default ?? module) as Partial<FigmaUpdaterConfig>;
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<LoadedConfig> {
  const { cwd = process.cwd(), configFile = 'texts-updater-by-figma.config.js', targetRoot } = options;
  const configPath = path.resolve(cwd, configFile);
  const userConfig = await importConfig(configPath);

  const figmaConfig = {
    ...DEFAULT_CONFIG.figma,
    ...userConfig?.figma,
    token: userConfig?.figma?.token ?? DEFAULT_CONFIG.figma.token ?? null,
  } satisfies FigmaUpdaterConfig['figma'];

  const translationsConfig = {
    ...DEFAULT_CONFIG.translations,
    ...userConfig?.translations,
  } satisfies FigmaUpdaterConfig['translations'];

  const rootDir = path.resolve(cwd, targetRoot ?? '.');

  return {
    figma: figmaConfig,
    translations: translationsConfig,
    eliza: userConfig?.eliza,
    rootDir,
    configPath: existsSync(configPath) ? configPath : undefined,
  };
}
