import { type Node, type TextNode } from '@figma/rest-api-spec';

import type { DiffMapping } from '../types.js';
import { FigmaClient } from './figma-client.js';

type NodeWithChildren = Extract<Node, { children: any[] }>;
type NodeMap = Record<string, Node>;

function isNodeWithChildren(node: Node): node is NodeWithChildren {
  return 'children' in node && Array.isArray(node.children) && node.children.length > 0;
}

function buildNodeMap(node: Node, map: NodeMap) {
  map[node.id] = node;

  if (isNodeWithChildren(node)) {
    for (const child of node.children) {
      buildNodeMap(child as Node, map);
    }
  }
}

function extractText(node: Node): string | null {
  if (node.type !== 'TEXT') {
    return null;
  }

  return ((node as TextNode).characters ?? '').trim();
}

export class DiffBuilder {
  constructor(private readonly figmaClient: FigmaClient) {}

  async buildDiffs(figmaUrl: string, versionOld: string, versionNew: string): Promise<DiffMapping> {
    const [oldDoc, newDoc] = await Promise.all([
      this.figmaClient.getDocument(figmaUrl, versionOld),
      this.figmaClient.getDocument(figmaUrl, versionNew),
    ]);

    const newMap: NodeMap = {};
    buildNodeMap(newDoc.document, newMap);

    const changes: DiffMapping = [];
    const seen = new Set<string>();

    function traverseAndCompare(oldNode: Node) {
      const oldText = extractText(oldNode);

      if (oldText && oldText.length > 0) {
        const match = newMap[oldNode.id];

        if (match) {
          const newText = extractText(match);

          if (newText && newText.length > 0 && oldText !== newText && !seen.has(oldText)) {
            seen.add(oldText);
            changes.push({
              [oldText]: newText,
            });
          }
        }
      }

      if (isNodeWithChildren(oldNode)) {
        for (const child of oldNode.children) {
          traverseAndCompare(child as Node);
        }
      }
    }

    traverseAndCompare(oldDoc.document);

    return changes;
  }
}
