import { logger } from './logger.js';
import type { DiffMapping, GetDiffsOptions, LoadedConfig } from './types.js';
import { loadConfig } from './modules/config.js';
import { getTextDiffsMapping } from './modules/diff-mapping.js';
import { getFigmaVersionsList } from './modules/figma-api.js';
import { applyDiffs } from './modules/file-updater.js';

export interface RunOptions extends GetDiffsOptions {
  cwd?: string;
  listOnly?: boolean;
}

async function ensureVersions(
  config: LoadedConfig,
  figmaUrl: string,
  oldVersion?: string,
  newVersion?: string,
): Promise<{ diffs?: DiffMapping; versions?: Awaited<ReturnType<typeof getFigmaVersionsList>> } | undefined> {
  if (!oldVersion || !newVersion) {
    const versions = await getFigmaVersionsList(config, figmaUrl);

    if (!versions) {
      logger.error('Версии макета не найдены.');
      return undefined;
    }

    logger.success('Доступные версии:');
    versions.forEach((version) => {
      logger.info(`${version.id} ${version.label ?? ''}`.trim());
      logger.info(new Date(version.created_at).toLocaleString());
      logger.info(version.user.handle);
      logger.info('');
    });

    return { versions };
  }

  const diffs = await getTextDiffsMapping(config, figmaUrl, oldVersion, newVersion);

  return { diffs };
}

export async function getDiffs(options: GetDiffsOptions, cwd?: string): Promise<DiffMapping | undefined> {
  const config = await loadConfig(cwd);
  const result = await ensureVersions(config, options.figmaUrl, options.oldVersion, options.newVersion);

  return result?.diffs;
}

export async function run(options: RunOptions) {
  const { figmaUrl, oldVersion, newVersion, listOnly, cwd } = options;
  const config = await loadConfig(cwd);
  const result = await ensureVersions(config, figmaUrl, oldVersion, newVersion);

  if (!result?.diffs) {
    return;
  }

  logger.info(`Найдено изменений: ${result.diffs.length}`);

  result.diffs.forEach((pair) => {
    const [from, to] = Object.entries(pair)[0];
    logger.info(`• "${from}" → "${to}"`);
  });

  if (listOnly) {
    logger.info('Режим просмотра: файлы не будут изменены.');
    return;
  }

  await applyDiffs({ diffs: result.diffs, config });
}

export { loadConfig };
export type { DiffMapping };
