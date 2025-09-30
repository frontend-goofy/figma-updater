declare module 'node:fs/promises' {
  export const readFile: (...args: any[]) => Promise<any>;
  export const writeFile: (...args: any[]) => Promise<any>;
  export const mkdir: (...args: any[]) => Promise<any>;
  export const mkdtemp: (...args: any[]) => Promise<any>;
}

declare module 'node:fs' {
  export const existsSync: (...args: any[]) => boolean;
}

declare module 'node:path' {
  const path: any;
  export default path;
}

declare module 'node:url' {
  export const pathToFileURL: (...args: any[]) => any;
}

declare module 'node:os' {
  export const tmpdir: () => string;
}

declare module 'node:assert/strict' {
  const assert: any;
  export default assert;
}

declare module 'node:test' {
  const test: any;
  export default test;
}

declare module 'cac' {
  export function cac(name: string): any;
}

declare module 'prompts' {
  const prompts: any;
  export default prompts;
}

declare module 'consola' {
  export function createConsola(...args: any[]): any;
}

declare module 'fast-levenshtein' {
  const levenshtein: {
    get: (a: string, b: string) => number;
  };

  export default levenshtein;
}

declare module '@figma/rest-api-spec' {
  export interface Version {
    id: string;
    label?: string;
    created_at?: string;
    user?: { handle?: string } | string;
  }

  interface BaseNode {
    id: string;
    name: string;
    type: string;
  }

  interface ParentNode extends BaseNode {
    children: Node[];
  }

  interface LeafNode extends BaseNode {
    children?: undefined;
    characters?: string;
  }

  export type Node = ParentNode | LeafNode;

  export interface TextNode extends LeafNode {
    type: 'TEXT';
    characters: string;
  }

  export type CanvasNode = Node;

  export interface GetFileResponse {
    document: Node;
  }

  export interface GetFileVersionsResponse {
    versions: Version[];
  }

  export interface GetFileNodesResponse {
    nodes: Record<string, { document?: Node }>;
  }
}

declare const process: {
  cwd: () => string;
  env: Record<string, string | undefined>;
  stdout: {
    isTTY?: boolean;
    columns?: number;
    clearLine: (...args: any[]) => void;
    cursorTo: (...args: any[]) => void;
    write: (...args: any[]) => void;
  };
  exitCode?: number;
};

declare const fetch: (...args: any[]) => Promise<any>;
type Response = any;
