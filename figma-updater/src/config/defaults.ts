import type { FigmaUpdaterConfig } from './types.js';

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

export const DEFAULT_ROOT = process.cwd();
