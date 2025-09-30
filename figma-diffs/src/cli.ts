#!/usr/bin/env node

import { cac } from 'cac';

import getFigmaDiffs from './index.js';
import { logger } from './logger.js';

const cli = cac('figma-diff');

cli
  .command('<figmaUrl> [oldVersion] [newVersion]')
  .action(async (figmaUrl: string, oldVersion?: string, newVersion?: string) => {
    logger.info('Getting diffs..');

    const figmaDiffs = await getFigmaDiffs(figmaUrl, oldVersion, newVersion);

    if (figmaDiffs === undefined) {
      logger.error('Failed to get diffs');
      process.exit(1);
    }

    logger.success(figmaDiffs);
    process.exit(0);
  });

cli.help();
cli.version('0.1.0');

cli.parse();
