# @yandex-id/figma-diffs

Пакет для сравнения текстовых узлов в макетах Figma между версиями. Он автоматически показывает, какие тексты изменены и формирует отчет. Помогает быстро отследить копирайт‑правки без ручной сверки экранов.

## Установка

```bash
npm i --save-dev @yandex-id/figma-diff
```

## Использование

```bash
npx @yandex-id/figma-diff <figma-url> <version-id-1> <version-id-2>
```

- <figma-url> - ссылка на макет в Figma.
- <version-id-x> - необязательные. ID версий макета в Figma.

Получить список ID версий макета:

```bash
npx @yandex-id/figma-diff https://figma.com/file/XYZ
```

Сравнить две версии макета:

```bash
npx @yandex-id/figma-diff https://figma.com/file/XYZ 123 321
```

Для запуска без проверки сертификатов можно добавить приписку:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx @yandex-id/figma-diff <figma-url> <version-id-1> <version-id-2>
```

В скрипте используются переменные окружения:

- `FIGMA_TOKEN` - токен для доступа к Figma API. Получить можно в настройках своего аккаунта в разделе "Security".
- `FIGMA_API_URL` - url-адрес к Figma API: https://api.figma.com/v1/files/

Пример запуска без .env-файла:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 FIGMA_API_URL=https://api.figma.com/v1/files/ FIGMA_TOKEN=MY_TOKEN321 npx @yandex-id/figma-diff https://figma.com/file/XYZ 123 321
```
