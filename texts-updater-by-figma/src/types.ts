import type { Version } from '@figma/rest-api-spec';

export type DiffPair = Record<string, string>;
export type DiffMapping = DiffPair[];

export interface FigmaConfig {
  apiUrl: string;
  token: string | null;
}

export interface ElizaConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface TranslationsConfig {
  /**
   * Relative path to the PO file that contains translations metadata.
   * The file is resolved from the directory where the updater runs.
   */
  path: string;
}

export interface FigmaUpdaterConfig {
  figma: FigmaConfig;
  translations: TranslationsConfig;
  eliza?: ElizaConfig;
}

export interface LoadedConfig extends FigmaUpdaterConfig {
  /**
   * Root directory where files should be updated.
   */
  rootDir: string;
  /**
   * Absolute path to the configuration file that was loaded (if any).
   */
  configPath?: string;
}

export interface VersionInfo {
  id: Version['id'];
  label?: Version['label'];
  createdAt: string;
  author: string;
}

export interface GetDiffsOptions {
  figmaUrl: string;
  oldVersion?: string;
  newVersion?: string;
}
