# @yandex-id/figma-updater

`@yandex-id/figma-updater` объединяет удобный поиск отличий текстов из Figma и автоматическое применение правок в кодовой базе.

## Возможности

- Получение списка версий макета из Figma.
- Формирование карты текстовых отличий между двумя версиями макета.
- Вывод найденных изменений в консоль (режим списка).
- Автоматическая замена строк в коде на основании `.po` файла с переводами.
- Поиск подходящего файла через Eliza API, если строка не найдена в переводах.

## Установка

```bash
npm i --save-dev @yandex-id/figma-updater
```

## Настройка

Создайте файл `figma-updater.config.js` в корне проекта и укажите ключевые параметры:

```js
export default {
  figma: {
    apiUrl: 'https://api.figma.com/v1/files/',
    token: process.env.FIGMA_TOKEN,
  },
  translations: {
    // путь до файла переводов относительно корня проекта
    path: 'src/locales/ru.po',
  },
  eliza: {
    endpoint: process.env.ELIZA_ENDPOINT,
    apiKey: process.env.ELIZA_TOKEN,
    model: process.env.ELIZA_MODEL,
  },
};
```

Поля `eliza` необязательны. Если их не указать, поиск файлов будет выполняться только по `.po` файлу.

## Использование

```bash
npx @yandex-id/figma-updater <figma-url> <old-version-id> <new-version-id>
```

- `<figma-url>` — ссылка на макет в Figma.
- `<old-version-id>` и `<new-version-id>` — идентификаторы версий макета. Если их не указать, инструмент выведет список доступных версий.

Для просмотра только списка изменений без правок добавьте флаг `--list`:

```bash
npx @yandex-id/figma-updater <figma-url> <old-version-id> <new-version-id> --list
```

## Скрипты npm

- `npm run build` — сборка библиотеки с помощью `@yandex-id/buildx`.
- `npm run lint:tsc` — проверка типов.
- `npm run prepare` — автосборка перед публикацией.

## Переменные окружения

- `FIGMA_TOKEN` — токен доступа к Figma API (используется, если не задан в конфиге).
- `FIGMA_API_URL` — базовый URL API Figma (по умолчанию `https://api.figma.com/v1/files/`).
- `ELIZA_ENDPOINT`, `ELIZA_TOKEN`, `ELIZA_MODEL` — параметры Eliza API (если не указаны в конфиге).

## Лицензия

UNLICENSED
