import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { LoadedConfig } from '../../config/types.js';
import { FileRewriter, type FileRewriterOptions } from '../file-rewriter.js';
import type { DiffMapping } from '../types.js';
import type { TranslationsMap } from '../translation-catalog.js';
import type { ElizaClient } from '../eliza-client.js';
import type { TranslationCatalog } from '../translation-catalog.js';

class StubTranslationCatalog {
  constructor(private readonly map: TranslationsMap) {}

  async read(): Promise<TranslationsMap> {
    return this.map;
  }
}

class StubElizaClient {
  constructor(private readonly suggestions: string[]) {}

  async findCodePaths(_oldText: string, _translations: TranslationsMap): Promise<string[] | null> {
    return this.suggestions;
  }
}

test('FileRewriter applies replacements using Eliza suggestions with translation text', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'figma-updater-'));
  const targetFileRelative = 'src/example.ts';
  const targetFilePath = path.join(tempDir, targetFileRelative);

  await mkdir(path.dirname(targetFilePath), { recursive: true });
  await writeFile(targetFilePath, 'const text = "Привет!";\n', { encoding: 'utf8' });

  const translations: TranslationsMap = {
    'Привет!': [`${targetFileRelative}:1`],
  };

  const config: LoadedConfig = {
    rootDir: tempDir,
    figma: { apiUrl: 'https://api.example', token: null },
    translations: { path: 'dummy.po' },
  };

  const options: FileRewriterOptions = {
    config,
    translations: new StubTranslationCatalog(translations) as unknown as TranslationCatalog,
    eliza: new StubElizaClient([`${targetFileRelative}:1`]) as unknown as ElizaClient,
  };

  const rewriter = new FileRewriter(options);
  const diffs: DiffMapping = [{ Привет: 'Здравствуйте' }];

  await rewriter.applyDiffs(diffs);

  const updatedContent = await readFile(targetFilePath, 'utf8');
  assert.equal(updatedContent, 'const text = "Здравствуйте";\n');
});

test('FileRewriter skips Eliza suggestions when text differs too much', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'figma-updater-'));
  const targetFileRelative = 'src/example.ts';
  const targetFilePath = path.join(tempDir, targetFileRelative);

  await mkdir(path.dirname(targetFilePath), { recursive: true });
  await writeFile(targetFilePath, 'const text = "Original";\n', { encoding: 'utf8' });

  const translations: TranslationsMap = {
    'Совсем другой текст': [`${targetFileRelative}:1`],
  };

  const config: LoadedConfig = {
    rootDir: tempDir,
    figma: { apiUrl: 'https://api.example', token: null },
    translations: { path: 'dummy.po' },
  };

  const options: FileRewriterOptions = {
    config,
    translations: new StubTranslationCatalog(translations) as unknown as TranslationCatalog,
    eliza: new StubElizaClient([`${targetFileRelative}:1`]) as unknown as ElizaClient,
  };

  const rewriter = new FileRewriter(options);
  const diffs: DiffMapping = [{ Original: 'Новый текст' }];

  await rewriter.applyDiffs(diffs);

  const updatedContent = await readFile(targetFilePath, 'utf8');
  assert.equal(updatedContent, 'const text = "Original";\n');
});
