import { type CanvasNode, type GetFileNodesResponse,
  type GetFileResponse,
  type GetFileVersionsResponse,
  type Node,
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

  private static assertNodesResponse(payload: unknown): asserts payload is GetFileNodesResponse {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('nodes' in payload) ||
      typeof (payload as { nodes?: unknown }).nodes !== 'object'
    ) {
      throw new Error('Неверный формат ответа от Figma API (nodes).');
    }
  }

  private async fetchNodes(
    figmaUrl: string,
    versionId: string,
    ids: string[],
  ): Promise<Record<string, Node>> {
    const result: Record<string, Node> = {};
    const MAX_IDS_PER_REQUEST = 10;

    for (let index = 0; index < ids.length; index += MAX_IDS_PER_REQUEST) {
      const chunk = ids.slice(index, index + MAX_IDS_PER_REQUEST);
      const suffix = `/nodes?ids=${chunk.join(',')}&version=${versionId}`;
      const response = await this.request(figmaUrl, suffix);
      const data = await response.json();

      FigmaClient.assertNodesResponse(data);

      const nodes = (data.nodes ?? {}) as GetFileNodesResponse['nodes'];

      for (const nodeId of Object.keys(nodes)) {
        const entry = nodes[nodeId];

        if (entry?.document) {
          result[nodeId] = entry.document;
        }
      }
    }

    return result;
  }

  async getDocument(figmaUrl: string, versionId: string): Promise<GetFileResponse> {
    const response = await this.request(figmaUrl, `?version=${versionId}&depth=1`);

    const data = await response.json();

    FigmaClient.assertFileResponse(data);

    const childNodes = Array.isArray(data.document.children)
      ? (data.document.children as Node[])
      : [];

    if (childNodes.length === 0) {
      return data;
    }

    const pageIds = childNodes.map((child) => child.id);
    const nodesMap = await this.fetchNodes(figmaUrl, versionId, pageIds);

    const enrichedChildren = childNodes.map((child) => nodesMap[child.id] ?? child);

    return {
      ...data,
      document: {
        ...data.document,
        children: enrichedChildren,
      },
    };
  }

  async getVersions(figmaUrl: string): Promise<Version[] | null> {
    const response = await this.request(figmaUrl, '/versions');
    const data = await response.json();

    FigmaClient.assertVersionsResponse(data);

    return data.versions.length > 0 ? data.versions : null;
  }
}
