import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { DEFAULT_CONFIG } from './defaults.js';
import type { FigmaUpdaterConfig, LoadedConfig } from './types.js';

export interface LoadConfigOptions {
  cwd?: string;
  /**
   * Relative path to the configuration file. Defaults to `figma-updater.config.js`.
   */
  configFile?: string;
  /**
   * Override the directory where files will be updated.
   */
  targetRoot?: string;
}

async function importConfig(configPath: string): Promise<Partial<FigmaUpdaterConfig> | null> {
  if (!existsSync(configPath)) {
    return null;
  }

  const module = await import(pathToFileURL(configPath).href);
  return (module.default ?? module) as Partial<FigmaUpdaterConfig>;
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<LoadedConfig> {
  const { cwd = process.cwd(), configFile = 'figma-updater.config.js', targetRoot } = options;
  const configPath = path.resolve(cwd, configFile);
  const userConfig = await importConfig(configPath);

  const figmaConfig = {
    ...DEFAULT_CONFIG.figma,
    ...userConfig?.figma,
    token: userConfig?.figma?.token ?? DEFAULT_CONFIG.figma.token ?? null,
  };

  const translationsConfig = {
    ...DEFAULT_CONFIG.translations,
    ...userConfig?.translations,
  };

  const rootDir = path.resolve(cwd, targetRoot ?? '.');

  return {
    figma: figmaConfig,
    translations: translationsConfig,
    eliza: userConfig?.eliza,
    rootDir,
    configPath: existsSync(configPath) ? configPath : undefined,
  };
}
