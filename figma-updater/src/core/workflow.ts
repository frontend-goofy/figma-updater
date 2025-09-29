import type { LoadedConfig, VersionInfo } from '../config/types.js';
import { DiffBuilder } from './diff-builder.js';
import { ElizaClient } from './eliza-client.js';
import { FigmaClient } from './figma-client.js';
import { FileRewriter } from './file-rewriter.js';
import type { DiffMapping } from './types.js';
import { TranslationCatalog } from './translation-catalog.js';

export interface BuildDiffOptions {
  figmaUrl: string;
  oldVersion: string;
  newVersion: string;
}

export class FigmaUpdaterWorkflow {
  private readonly figmaClient: FigmaClient;
  private readonly diffBuilder: DiffBuilder;
  private readonly translationCatalog: TranslationCatalog;
  private readonly elizaClient: ElizaClient;
  private readonly fileRewriter: FileRewriter;

  constructor(private readonly config: LoadedConfig) {
    this.figmaClient = new FigmaClient(config.figma);
    this.diffBuilder = new DiffBuilder(this.figmaClient);
    this.translationCatalog = new TranslationCatalog(config);
    this.elizaClient = new ElizaClient(config.eliza);
    this.fileRewriter = new FileRewriter({
      config,
      translations: this.translationCatalog,
      eliza: this.elizaClient,
    });
  }

  async listVersions(figmaUrl: string): Promise<VersionInfo[] | null> {
    const versions = await this.figmaClient.getVersions(figmaUrl);

    if (!versions) {
      return null;
    }

    return versions.map((version) => ({
      id: version.id,
      label: version.label ?? undefined,
      createdAt: new Date(version.created_at).toISOString(),
      author: version.user.handle,
    }));
  }

  async buildDiffs(options: BuildDiffOptions): Promise<DiffMapping> {
    return this.diffBuilder.buildDiffs(options.figmaUrl, options.oldVersion, options.newVersion);
  }

  async applyDiffs(diffs: DiffMapping): Promise<void> {
    await this.fileRewriter.applyDiffs(diffs);
  }
}
