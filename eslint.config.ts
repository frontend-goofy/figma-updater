import { configs, defineConfig } from '@yandex-id/eslint-config';

export default defineConfig(configs.recommended, {
  ignores: ['lib/**/*'],
});
