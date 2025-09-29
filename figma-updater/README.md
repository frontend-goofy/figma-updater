# @yandex-id/figma-updater

`@yandex-id/figma-updater` — CLI и библиотека для автоматического переноса текстовых правок из макетов Figma в кодовую базу.
Инструмент объединяет скачивание версий из Figma, построение diff по текстовым узлам и замену строк в файлах проекта
по данным из PO-файла переводов или с помощью Eliza API.

## Основные возможности

- Список всех версий макета по ссылке из Figma.
- Формирование карты изменений между двумя версиями (дифф по текстовым узлам).
- Интерактивный CLI со сценарием: ссылка → выбор версий → указание директории → применение правок.
- Просмотр изменений без применения (режим `--list`).
- Замена строк в коде по данным PO-файла, поиск альтернативных путей через Eliza API.
- Программный API для интеграции в пайплайны и свои скрипты.

## Установка

```bash
npm install --save-dev @yandex-id/figma-updater
```

## Конфигурация

Создайте файл `figma-updater.config.js` в каталоге проекта (или используйте пример из корня репозитория) и заполните настройки:

```js
export default {
  figma: {
    apiUrl: 'https://api.figma.com/v1/files/',
    token: process.env.FIGMA_TOKEN,
  },
  translations: {
    // путь до PO-файла с переводами относительно директории запуска
    path: 'src/locales/ru.po',
  },
  eliza: {
    // интеграция необязательна, оставьте поля пустыми чтобы отключить
    endpoint: process.env.ELIZA_ENDPOINT,
    apiKey: process.env.ELIZA_TOKEN,
    model: process.env.ELIZA_MODEL,
  },
};
```

> Все пути интерпретируются относительно директории, из которой запускается CLI или вызывается библиотека.
>
> Токен Figma можно указать напрямую в конфиге либо через переменную окружения `FIGMA_TOKEN`.

### Минимальный набор данных

Для работы достаточно указать:

1. Токен Figma с правом чтения файлов (`figma.token`).
2. Путь к PO-файлу с переводами (`translations.path`).

Интеграция с Eliza API (`eliza.*`) опциональна и используется только если строка не найдена в переводах.

## Использование CLI

```bash
npx figma-updater
```

Дальнейший сценарий соответствует описанному флоу:

1. **Введите ссылку на макет Figma.** Если команда запущена с аргументом `<figmaUrl>`, этот шаг пропускается.
2. **Выберите две версии макета.** Инструмент загрузит полный список доступных версий и предложит выбрать старую и новую версии через интерактивное меню. Если передать `--old` и `--new`, выбор версий пропускается.
3. **Укажите директорию для обновления файлов.** По умолчанию используется текущая директория запуска, но можно ввести любой путь или задать его опцией `--dir`.
4. **Просмотрите найденные изменения.** После подтверждения инструмент выведет список замен и либо остановится (с флагом `--list`), либо применит изменения к файлам.

Дополнительные опции:

- `--list` — показать только список замен без изменения файлов.
- `--dir <path>` — указать директорию обновления без интерактивного вопроса.
- `--cwd <path>` — использовать конфигурацию из другой директории (по умолчанию текущая).

### Примеры

Показать версии макета:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx figma-updater https://www.figma.com/file/XXXXX/project
```

Применить правки между двумя версиями в указанной директории:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx figma-updater https://www.figma.com/file/XXXXX/project --old=123-abc --new=456-def --dir ./apps/frontend
```

Посмотреть diff без замены файлов:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx figma-updater https://www.figma.com/file/XXXXX/project --old=123-abc --new=456-def --list
```

## Программный API

```ts
import { getDiffs, listVersions, run } from '@yandex-id/figma-updater';

await listVersions('https://www.figma.com/file/XXXXX/project');

const diffs = await getDiffs({
  figmaUrl: 'https://www.figma.com/file/XXXXX/project',
  oldVersion: '123-abc',
  newVersion: '456-def',
  directory: './apps/frontend',
});

await run({
  figmaUrl: 'https://www.figma.com/file/XXXXX/project',
  oldVersion: '123-abc',
  newVersion: '456-def',
  directory: './apps/frontend',
});
```

Методы `getDiffs` и `run` автоматически используют конфигурацию из `figma-updater.config.js` в текущей директории (или в каталоге, переданном в `cwd`).

## Переменные окружения

- `FIGMA_TOKEN` — токен доступа к Figma API.
- `FIGMA_API_URL` — альтернативный базовый URL API Figma.
- `ELIZA_ENDPOINT`, `ELIZA_TOKEN`, `ELIZA_MODEL` — параметры подключения к Eliza API.

## Скрипты npm

- `npm run build` — сборка библиотеки через `@yandex-id/buildx`.
- `npm run lint:tsc` — проверка типов TypeScript.
- `npm run prepare` — автоматическая сборка перед публикацией.

## Лицензия

UNLICENSED
