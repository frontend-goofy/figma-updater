/**
 * Конфигурация figma-updater.
 *
 * Все пути задаются относительно директории, из которой запускается команда.
 */
export default {
  figma: {
    /**
     * Базовый URL для Figma REST API. Можно переопределить при использовании прокси.
     */
    apiUrl: process.env.FIGMA_API_URL ?? 'https://api.figma.com/v1/files/',
    /**
     * Персональный токен доступа Figma. Его можно задать здесь или через FIGMA_TOKEN.
     */
    token: process.env.FIGMA_TOKEN ?? '',
  },
  translations: {
    /**
     * Относительный путь до PO-файла с переводами, который содержит ссылки на исходники.
     */
    path: 'src/locales/ru.po',
  },
  /**
   * Необязательная интеграция с Eliza API, используемая для поиска пути к файлу,
   * если строка не найдена в переводах. Оставьте пустым, чтобы отключить интеграцию.
   */
  eliza: {
    endpoint: process.env.ELIZA_ENDPOINT ?? '',
    apiKey: process.env.ELIZA_TOKEN ?? '',
    model: process.env.ELIZA_MODEL ?? '',
  },
};
