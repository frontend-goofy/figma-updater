import path from 'node:path';

import { loadConfig } from './config.js';
import { logger } from './logger.js';
import type {
  DiffMapping,
  GetDiffsOptions,
  LoadedConfig,
  RunOptions,
  RuntimeOptions,
  VersionInfo,
} from './types.js';
import { FigmaUpdaterWorkflow } from './core/workflow.js';

async function createWorkflow(options: RuntimeOptions): Promise<FigmaUpdaterWorkflow> {
  const { cwd, directory } = options;
  const resolvedCwd = cwd ? path.resolve(cwd) : process.cwd();
  const config: LoadedConfig = await loadConfig({ cwd: resolvedCwd, targetRoot: directory });

  return new FigmaUpdaterWorkflow(config);
}

export async function listVersions(figmaUrl: string, options: RuntimeOptions = {}): Promise<VersionInfo[] | null> {
  const workflow = await createWorkflow(options);
  return workflow.listVersions(figmaUrl);
}

export async function getDiffs(
  options: GetDiffsOptions & RuntimeOptions,
): Promise<DiffMapping | undefined> {
  const workflow = await createWorkflow(options);
  const { figmaUrl, oldVersion, newVersion } = options;

  if (!oldVersion || !newVersion) {
    logger.warn('Необходимо указать обе версии макета для расчета diff.');
    return undefined;
  }

  return workflow.buildDiffs({ figmaUrl, oldVersion, newVersion });
}

export async function run(options: RunOptions): Promise<void> {
  const { figmaUrl, oldVersion, newVersion, listOnly, ...runtime } = options;
  const workflow = await createWorkflow(runtime);

  if (!oldVersion || !newVersion) {
    const versions = await workflow.listVersions(figmaUrl);

    if (!versions) {
      logger.error('Версии макета не найдены.');
      return;
    }

    logger.success('Доступные версии:');
    versions.forEach((version) => {
      const label = version.label ? ` ${version.label}` : '';
      logger.info(`${version.id}${label}`.trim());
      logger.info(new Date(version.createdAt).toLocaleString());
      logger.info(version.author);
      logger.info('');
    });

    return;
  }

  const diffs = await workflow.buildDiffs({ figmaUrl, oldVersion, newVersion });

  if (diffs.length === 0) {
    logger.info('Изменений не найдено.');
    return;
  }

  logger.info(`Найдено изменений: ${diffs.length}`);

  diffs.forEach((pair) => {
    const [from, to] = Object.entries(pair)[0];
    if (from && to) {
      logger.info(`• "${from}" → "${to}"`);
    }
  });

  if (listOnly) {
    logger.info('Режим просмотра: файлы не будут изменены.');
    return;
  }

  await workflow.applyDiffs(diffs);
}

export { loadConfig };
