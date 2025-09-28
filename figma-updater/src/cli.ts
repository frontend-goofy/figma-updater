#!/usr/bin/env node

import 'dotenv/config';

import { cac } from 'cac';

import { logger } from './logger.js';
import { run } from './index.js';

const cli = cac('figma-updater');

cli
  .command('<figmaUrl> [oldVersion] [newVersion]')
  .option('--list', 'Только показать список изменений без применения правок')
  .action(async (figmaUrl: string, oldVersion?: string, newVersion?: string, options?: { list?: boolean }) => {
    try {
      await run({ figmaUrl, oldVersion, newVersion, listOnly: options?.list });
    } catch (error) {
      logger.error((error as Error).message);
      process.exitCode = 1;
    }
  });

cli.help();
cli.version('0.1.0');

cli.parse();
