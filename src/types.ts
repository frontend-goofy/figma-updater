import type { Version } from '@figma/rest-api-spec';
import type { ElizaClient } from './core/eliza-client.js';
import type { TranslationCatalog } from './core/translation-catalog.js';

export interface CliFlags {
  list?: boolean;
  dir?: string;
  old?: string;
  new?: string;
  cwd?: string;
}

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

export interface RuntimeOptions {
  cwd?: string;
  directory?: string;
}

export interface RunOptions extends GetDiffsOptions, RuntimeOptions {
  listOnly?: boolean;
}

export interface LoadConfigOptions {
  cwd?: string;
  /**
   * Relative path to the configuration file. Defaults to `texts-updater-by-figma.config.js`.
   */
  configFile?: string;
  /**
   * Override the directory where files will be updated.
   */
  targetRoot?: string;
}

export interface VersionSelectionResult {
  oldVersion: string;
  newVersion: string;
}

export interface BuildDiffOptions {
  figmaUrl: string;
  oldVersion: string;
  newVersion: string;
}

export interface FileRewriterOptions {
  config: LoadedConfig;
  translations: TranslationCatalog;
  eliza: ElizaClient;
}

export interface ReplacementCandidate {
  codePath: string;
  searchText: string;
}

export interface ErrorLogOptions {
  context?: string;
}

export type PromptResult = string[] | undefined | null;

export interface ElizaResponse {
  response?: {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}
