import { type Node, type TextNode } from '@figma/rest-api-spec';

import { getFigmaDocument } from './api.js';

type diffsType = Array<Record<string, string>>;
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

export default async function getTextDiffsMapping(
  url: string,
  versionOld: string,
  versionNew: string,
  fetchDoc: typeof getFigmaDocument = getFigmaDocument,
) {
  const [oldDoc, newDoc] = await Promise.all([
    fetchDoc(url, versionOld),
    fetchDoc(url, versionNew),
  ]);

  const newMap: NodeMap = {};

  buildNodeMap(newDoc.document, newMap);

  const changes = [] as diffsType;

  const seen = new Set<string>();

  function traverseAndCompare(oldNode: Node) {
    if (oldNode.type === 'TEXT') {
      const oldText = (oldNode as TextNode).characters ?? '';
      const match = newMap[oldNode.id];

      if (match && match.type === 'TEXT') {
        const newText = (match as TextNode).characters ?? '';

        if (oldText !== newText && !seen.has(oldText)) {
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
