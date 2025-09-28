import { defineConfig } from '@yandex-id/buildx';

export default defineConfig({
  cleanDir: './lib',
  input: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  output: [
    {
      format: 'es',
    },
    {
      format: 'cjs',
    },
  ],
  builtin: {
    dts: {
      tsconfigFile: './tsconfig.lib.json',
    },
    swc: {
      tsconfigFile: './tsconfig.lib.json',
      jsc: {
        externalHelpers: true,
      },
    },
  },
});
