import type { Version } from '@figma/rest-api-spec';

export type DiffMapping = Array<Record<string, string>>;

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
  path: string;
}

export interface FigmaUpdaterConfig {
  figma: FigmaConfig;
  eliza?: ElizaConfig;
  translations: TranslationsConfig;
}

export interface LoadedConfig extends FigmaUpdaterConfig {
  rootDir: string;
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

export interface ApplyDiffsOptions {
  diffs: DiffMapping;
  config: LoadedConfig;
}
