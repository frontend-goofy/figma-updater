import prompts from 'prompts';

import type { VersionInfo } from '../config/types.js';

const onCancel = () => {
  throw new Error('Операция отменена пользователем.');
};

export async function promptForFigmaUrl(initial?: string): Promise<string> {
  const { figmaUrl } = await prompts(
    {
      type: 'text',
      name: 'figmaUrl',
      message: 'Вставьте ссылку на макет Figma',
      initial,
      validate(value: string) {
        return value && value.includes('figma.com') ? true : 'Укажите корректную ссылку на Figma.';
      },
    },
    { onCancel },
  );

  return figmaUrl;
}

export interface VersionSelectionResult {
  oldVersion: string;
  newVersion: string;
}

function formatVersion(version: VersionInfo): string {
  const date = new Date(version.createdAt).toLocaleString();
  const label = version.label ? ` • ${version.label}` : '';
  return `${version.id}${label} — ${date} — ${version.author}`;
}

export async function promptForVersions(
  versions: VersionInfo[],
  defaults?: Partial<VersionSelectionResult>,
): Promise<VersionSelectionResult> {
  const sorted = [...versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const choices = sorted.map((version) => ({
    title: formatVersion(version),
    value: version.id,
  }));

  const defaultOldIndex = defaults?.oldVersion
    ? Math.max(
        choices.findIndex((choice) => choice.value === defaults.oldVersion),
        0,
      )
    : 0;

  const defaultNewIndex = defaults?.newVersion
    ? Math.max(
        choices.findIndex((choice) => choice.value === defaults.newVersion),
        0,
      )
    : Math.min(choices.length - 1, 1);

  const answers = await prompts(
    [
      {
        type: 'select',
        name: 'oldVersion',
        message: 'Выберите версию, из которой будут браться тексты (старая версия)',
        choices,
        initial: defaultOldIndex,
      },
      {
        type: 'select',
        name: 'newVersion',
        message: 'Выберите версию, на которую нужно обновиться (новая версия)',
        choices,
        initial: defaultNewIndex,
      },
    ],
    { onCancel },
  );

  return answers as VersionSelectionResult;
}

export async function promptForDirectory(defaultValue: string): Promise<string> {
  const { directory } = await prompts(
    {
      type: 'text',
      name: 'directory',
      message: `Укажите путь к директории для замены строк (пусто — ${defaultValue})`,
      initial: '',
    },
    { onCancel },
  );

  return directory;
}
