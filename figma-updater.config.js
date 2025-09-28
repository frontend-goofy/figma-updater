export default {
  figma: {
    apiUrl: process.env.FIGMA_API_URL ?? 'https://api.figma.com/v1/files/',
    token: process.env.FIGMA_TOKEN ?? null,
  },
  translations: {
    path: 'src/locales/ru.po',
  },
  eliza: {
    endpoint: process.env.ELIZA_ENDPOINT ?? '',
    apiKey: process.env.ELIZA_TOKEN ?? '',
    model: process.env.ELIZA_MODEL ?? '',
  },
};
