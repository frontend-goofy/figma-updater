import {
  type GetFileResponse,
  type GetFileVersionsResponse,
  type Version,
} from '@figma/rest-api-spec';

function isGetFileResponse(x: unknown): x is GetFileResponse {
  return typeof x === 'object' && x !== null && 'document' in x;
}

function isGetFileVersionsResponse(x: unknown): x is GetFileVersionsResponse {
  return (
    typeof x === 'object' && x !== null && 'versions' in x && Array.isArray((x as any).versions)
  );
}

async function figmaRequest(url: string, path: string): Promise<Response> {
  const FIGMA_API_URL = process.env.FIGMA_API_URL;
  const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

  const headers: Record<string, string> = FIGMA_TOKEN ? { 'X-FIGMA-TOKEN': FIGMA_TOKEN } : {};

  const fileKeyMatch = url.match(/figma\.com\/design\/([a-zA-Z0-9]+)\//);
  const fileKey = fileKeyMatch ? fileKeyMatch[1] : null;

  if (!fileKey) {
    throw new Error('Неверный формат URL Figma');
  }

  const res = await fetch(`${FIGMA_API_URL}${fileKey}${path}`, { headers });

  if (!res.ok) {
    throw new Error(`Ошибка при запросе к Figma API: ${res.status} ${res.statusText}`);
  }

  return res;
}

export async function getFigmaDocument(url: string, versionId: string): Promise<GetFileResponse> {
  const figmaResponse = await figmaRequest(url, `?version=${versionId}`);
  const figmaResponseJSON = await figmaResponse.json();

  if (!isGetFileResponse(figmaResponseJSON)) {
    throw new Error('Неверный формат ответа от Figma API');
  }

  return figmaResponseJSON;
}

export async function getFigmaVersionsList(url: string): Promise<Version[] | null> {
  const figmaResponse = await figmaRequest(url, '/versions');
  const figmaResponseJSON = await figmaResponse.json();

  if (!isGetFileVersionsResponse(figmaResponseJSON)) {
    throw new Error('Неверный формат ответа от Figma API');
  }
  if (!figmaResponseJSON.versions || figmaResponseJSON.versions.length === 0) {
    return null;
  }

  return figmaResponseJSON.versions;
}
