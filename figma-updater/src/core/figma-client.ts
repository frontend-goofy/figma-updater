import {
  type GetFileResponse,
  type GetFileVersionsResponse,
  type Version,
} from '@figma/rest-api-spec';

import type { FigmaConfig } from '../config/types.js';

function ensureTrailingSlash(input: string): string {
  return input.endsWith('/') ? input : `${input}/`;
}

function extractFileKey(url: string): string {
  const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)\//);

  if (!match) {
    throw new Error('Неверный формат URL Figma.');
  }

  return match[1];
}

export class FigmaClient {
  constructor(private readonly options: FigmaConfig) {}

  private async request(figmaUrl: string, suffix: string): Promise<Response> {
    const headers: Record<string, string> = {};

    if (this.options.token) {
      headers['X-FIGMA-TOKEN'] = this.options.token;
    }

    const apiUrl = ensureTrailingSlash(this.options.apiUrl);
    const fileKey = extractFileKey(figmaUrl);

    const response = await fetch(`${apiUrl}${fileKey}${suffix}`, { headers });

    if (!response.ok) {
      throw new Error(`Ошибка при запросе к Figma API: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  private static assertFileResponse(payload: unknown): asserts payload is GetFileResponse {
    if (typeof payload !== 'object' || payload === null || !('document' in payload)) {
      throw new Error('Неверный формат ответа от Figma API.');
    }
  }

  private static assertVersionsResponse(payload: unknown): asserts payload is GetFileVersionsResponse {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('versions' in payload) ||
      !Array.isArray((payload as { versions?: Version[] }).versions)
    ) {
      throw new Error('Неверный формат ответа от Figma API.');
    }
  }

  async getDocument(figmaUrl: string, versionId: string): Promise<GetFileResponse> {
    const response = await this.request(figmaUrl, `?version=${versionId}`);
    const data = await response.json();

    FigmaClient.assertFileResponse(data);

    return data;
  }

  async getVersions(figmaUrl: string): Promise<Version[] | null> {
    const response = await this.request(figmaUrl, '/versions');
    const data = await response.json();

    FigmaClient.assertVersionsResponse(data);

    return data.versions.length > 0 ? data.versions : null;
  }
}
