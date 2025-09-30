export default {
  figma: {
    apiUrl: process.env.FIGMA_API_URL ?? 'https://api.figma.com/v1/files/',
    token: process.env.FIGMA_TOKEN ?? '',
  },
  translations: {
    path: 'src/locales/ru.po',
  },
  eliza: {
    endpoint: process.env.ELIZA_ENDPOINT ?? 'https://api.eliza.yandex.net/internal/deepseek/v1/chat/completions',
    apiKey: process.env.ELIZA_TOKEN ?? '',
    model: process.env.ELIZA_MODEL ?? 'deepseek_v3',
  },
};
