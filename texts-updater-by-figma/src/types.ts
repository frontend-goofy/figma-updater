export type { DiffMapping } from './core/types.js';
export type {
  FigmaConfig,
  FigmaUpdaterConfig,
  LoadedConfig,
  TranslationsConfig,
  ElizaConfig,
  VersionInfo,
} from './config/types.js';

export interface GetDiffsOptions {
  figmaUrl: string;
  oldVersion?: string;
  newVersion?: string;
}
