import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { FigmaUpdaterConfig, LoadedConfig } from '../types.js';

const DEFAULTS: FigmaUpdaterConfig = {
  figma: {
    apiUrl: process.env.FIGMA_API_URL ?? 'https://api.figma.com/v1/files/',
    token: process.env.FIGMA_TOKEN ?? null,
  },
  translations: {
    path: 'src/locales/ru.po',
  },
};

async function importConfig(configPath: string): Promise<Partial<FigmaUpdaterConfig> | null> {
  if (!existsSync(configPath)) {
    return null;
  }

  const module = await import(pathToFileURL(configPath).href);

  return (module.default ?? module) as Partial<FigmaUpdaterConfig>;
}

export async function loadConfig(cwd = process.cwd()): Promise<LoadedConfig> {
  const configPath = path.resolve(cwd, 'figma-updater.config.js');
  const userConfig = await importConfig(configPath);

  const figmaConfig = {
    ...DEFAULTS.figma,
    ...userConfig?.figma,
    token: userConfig?.figma?.token ?? DEFAULTS.figma.token ?? null,
  };

  const translationsConfig = {
    ...DEFAULTS.translations,
    ...userConfig?.translations,
  };

  const elizaConfig = userConfig?.eliza;

  return {
    figma: figmaConfig,
    translations: translationsConfig,
    eliza: elizaConfig,
    rootDir: cwd,
  };
}
