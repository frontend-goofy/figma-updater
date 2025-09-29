# figma-updater

Monorepo, содержащий полностью переработанный пакет `@yandex-id/figma-updater`. Новый релиз объединяет модульную архитектуру,
интерактивный CLI и подробную документацию для быстрой настройки.

## Структура репозитория

- `figma-updater/` — исходники пакета, TypeScript-код и документация.
- `figma-updater.config.js` — пример конфигурации для запуска CLI.
- `figma-diffs/`, `update-files-by-figma-diff/` — вспомогательные утилиты из предыдущих итераций (оставлены без изменений).

## Быстрый старт

1. Установите зависимости пакета:
   ```bash
   cd figma-updater
   npm install
   ```
2. Скопируйте `figma-updater.config.js` в свой проект и заполните токены.
3. Запустите интерактивный CLI:
   ```bash
   npx figma-updater
   ```

Полная документация и примеры приведены в [`figma-updater/README.md`](figma-updater/README.md).
