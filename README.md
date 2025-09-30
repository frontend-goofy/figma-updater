# texts-updater-by-figma

Monorepo, содержащий полностью переработанный пакет `@yandex-id/texts-updater-by-figma`. Новый релиз объединяет модульную архитектуру,
интерактивный CLI и подробную документацию для быстрой настройки.

## Структура репозитория

- `texts-updater-by-figma/` — исходники пакета, TypeScript-код и документация.
- `texts-updater-by-figma.config.js` — пример конфигурации для запуска CLI.
- `figma-diffs/`, `update-files-by-figma-diff/` — вспомогательные утилиты из предыдущих итераций (оставлены без изменений).

## Быстрый старт

1. Установите зависимости пакета:
   ```bash
   cd texts-updater-by-figma
   npm install
   ```
2. Скопируйте `texts-updater-by-figma.config.js` в свой проект и заполните токены.
3. Запустите интерактивный CLI:
   ```bash
   npx texts-updater-by-figma
   ```

Полная документация и примеры приведены в [`texts-updater-by-figma/README.md`](texts-updater-by-figma/README.md).
