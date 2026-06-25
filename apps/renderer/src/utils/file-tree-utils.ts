import type { FileNode } from '@verity/core/ipc';

export interface FlatFileRow {
  readonly node: FileNode;
  readonly depth: number;
}

/** Flattens expanded directories into a single list for virtual scrolling. */
export function flattenVisibleFileTree(
  nodes: readonly FileNode[],
  expandedPaths: ReadonlySet<string>,
  depth = 0,
): FlatFileRow[] {
  const rows: FlatFileRow[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    if (
      node.type === 'directory' &&
      expandedPaths.has(node.path) &&
      node.children &&
      node.children.length > 0
    ) {
      rows.push(...flattenVisibleFileTree(node.children, expandedPaths, depth + 1));
    }
  }
  return rows;
}

export const FILE_TREE_ROW_HEIGHT = 26;
