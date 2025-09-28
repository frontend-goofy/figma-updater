import {
  type GetFileResponse,
  type GetFileVersionsResponse,
  type Version,
} from '@figma/rest-api-spec';

import type { LoadedConfig } from '../types.js';

function ensureTrailingSlash(input: string): string {
  return input.endsWith('/') ? input : `${input}/`;
}

function extractFileKey(url: string): string {
  const fileKeyMatch = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)\//);

  if (!fileKeyMatch) {
    throw new Error('Неверный формат URL Figma');
  }

  return fileKeyMatch[1];
}

async function figmaRequest(config: LoadedConfig, url: string, path: string): Promise<Response> {
  const { figma } = config;
  const headers: Record<string, string> = {};

  if (figma.token) {
    headers['X-FIGMA-TOKEN'] = figma.token;
  }

  const fileKey = extractFileKey(url);
  const apiUrl = ensureTrailingSlash(figma.apiUrl);

  const response = await fetch(`${apiUrl}${fileKey}${path}`, { headers });

  if (!response.ok) {
    throw new Error(`Ошибка при запросе к Figma API: ${response.status} ${response.statusText}`);
  }

  return response;
}

function isFileResponse(payload: unknown): payload is GetFileResponse {
  return typeof payload === 'object' && payload !== null && 'document' in payload;
}

function isVersionsResponse(payload: unknown): payload is GetFileVersionsResponse {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'versions' in payload &&
    Array.isArray((payload as { versions?: Version[] }).versions)
  );
}

export async function getFigmaDocument(
  config: LoadedConfig,
  url: string,
  versionId: string,
): Promise<GetFileResponse> {
  const response = await figmaRequest(config, url, `?version=${versionId}`);
  const data = await response.json();

  if (!isFileResponse(data)) {
    throw new Error('Неверный формат ответа от Figma API');
  }

  return data;
}

export async function getFigmaVersionsList(
  config: LoadedConfig,
  url: string,
): Promise<Version[] | null> {
  const response = await figmaRequest(config, url, '/versions');
  const data = await response.json();

  if (!isVersionsResponse(data)) {
    throw new Error('Неверный формат ответа от Figma API');
  }

  return data.versions && data.versions.length > 0 ? data.versions : null;
}
