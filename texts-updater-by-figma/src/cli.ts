#!/usr/bin/env node

import path from 'node:path';
import { cac } from 'cac';

import { logError, logger } from './logger.js';
import { run, listVersions } from './index.js';
import { promptForDirectory, promptForFigmaUrl, promptForVersions } from './cli/prompts.js';

interface CliFlags {
  list?: boolean;
  dir?: string;
  old?: string;
  new?: string;
  cwd?: string;
}

const cli = cac('texts-updater-by-figma');

cli
  .command('[figmaUrl]')
  .option('--old <version>', 'Идентификатор версии, из которой брать тексты')
  .option('--new <version>', 'Идентификатор версии, в которую нужно обновиться')
  .option('--dir <path>', 'Директория, где будут заменены строки (по умолчанию — текущая)')
  .option('--cwd <path>', 'Каталог, относительно которого ищется конфигурация')
  .option('--list', 'Только показать список изменений без применения правок')
  .action(async (figmaUrlArg: string | undefined, flags: CliFlags) => {
    try {
      const cwd = flags.cwd ? path.resolve(flags.cwd) : process.cwd();
      let figmaUrl = figmaUrlArg;

      if (!figmaUrl) {
        figmaUrl = await promptForFigmaUrl();
      }

      figmaUrl = figmaUrl?.trim();

      if (!figmaUrl) {
        throw new Error('Не указана ссылка на макет Figma.');
      }

      let oldVersion = flags.old;
      let newVersion = flags.new;

      if (!oldVersion || !newVersion) {
        const versions = await listVersions(figmaUrl, { cwd, directory: flags.dir });

        if (!versions) {
          throw new Error('Версии макета не найдены.');
        }

        const selection = await promptForVersions(versions, {
          oldVersion,
          newVersion,
        });

        oldVersion = selection.oldVersion;
        newVersion = selection.newVersion;
      }

      if (!oldVersion || !newVersion) {
        throw new Error('Не удалось определить версии макета.');
      }

      let directory = flags.dir?.trim();

      if (!directory && !flags.list) {
        const answer = await promptForDirectory(process.cwd());
        directory = answer && answer.trim().length > 0 ? answer.trim() : '.';
      }

      if (!directory) {
        directory = '.';
      }

      await run({
        figmaUrl,
        oldVersion,
        newVersion,
        listOnly: flags.list,
        cwd,
        directory,
      });
    } catch (error) {
      logError(error, { context: 'Ошибка выполнения команды' });
      process.exitCode = 1;
    }
  });

cli.help();
cli.version('1.0.0');
cli.parse();
