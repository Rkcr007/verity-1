import { useMemo, useState } from 'react';
import type { FileNode } from '@verity/core/ipc';
import { IC, Icon } from './Icon.js';
import {
  FILE_TREE_ROW_HEIGHT,
  flattenVisibleFileTree,
  type FlatFileRow,
} from '../utils/file-tree-utils.js';

const VIRTUAL_THRESHOLD = 60;
const VIEWPORT_HEIGHT = 280;

export interface RepositoryFileTreeProps {
  nodes: readonly FileNode[];
  expandedPaths: ReadonlySet<string>;
  selectedPath: string | null;
  onToggleExpand: (path: string) => void;
  onSelectFile: (path: string) => void;
}

/**
 * IDE-style repository explorer with windowed rendering for large trees (M7).
 */
export function RepositoryFileTree({
  nodes,
  expandedPaths,
  selectedPath,
  onToggleExpand,
  onSelectFile,
}: RepositoryFileTreeProps): React.ReactElement {
  const rows = useMemo(
    () => flattenVisibleFileTree(nodes, expandedPaths),
    [nodes, expandedPaths],
  );

  if (rows.length <= VIRTUAL_THRESHOLD) {
    return (
      <>
        {rows.map((row) => (
          <FileTreeRow
            key={row.node.path}
            row={row}
            expanded={expandedPaths.has(row.node.path)}
            selected={selectedPath === row.node.path}
            onToggleExpand={onToggleExpand}
            onSelectFile={onSelectFile}
          />
        ))}
      </>
    );
  }

  return (
    <VirtualFileTree
      rows={rows}
      expandedPaths={expandedPaths}
      selectedPath={selectedPath}
      onToggleExpand={onToggleExpand}
      onSelectFile={onSelectFile}
    />
  );
}

function VirtualFileTree({
  rows,
  expandedPaths,
  selectedPath,
  onToggleExpand,
  onSelectFile,
}: {
  rows: readonly FlatFileRow[];
  expandedPaths: ReadonlySet<string>;
  selectedPath: string | null;
  onToggleExpand: (path: string) => void;
  onSelectFile: (path: string) => void;
}): React.ReactElement {
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = rows.length * FILE_TREE_ROW_HEIGHT;
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / FILE_TREE_ROW_HEIGHT) + 4;
  const startIndex = Math.max(0, Math.floor(scrollTop / FILE_TREE_ROW_HEIGHT) - 2);
  const endIndex = Math.min(rows.length, startIndex + visibleCount);
  const slice = rows.slice(startIndex, endIndex);

  return (
    <div
      role="tree"
      aria-label="Repository files"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      style={{
        maxHeight: VIEWPORT_HEIGHT,
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: startIndex * FILE_TREE_ROW_HEIGHT,
            left: 0,
            right: 0,
          }}
        >
          {slice.map((row) => (
            <FileTreeRow
              key={row.node.path}
              row={row}
              expanded={expandedPaths.has(row.node.path)}
              selected={selectedPath === row.node.path}
              onToggleExpand={onToggleExpand}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FileTreeRow({
  row,
  expanded,
  selected,
  onToggleExpand,
  onSelectFile,
}: {
  row: FlatFileRow;
  expanded: boolean;
  selected: boolean;
  onToggleExpand: (path: string) => void;
  onSelectFile: (path: string) => void;
}): React.ReactElement {
  const [hover, setHover] = useState(false);
  const { node, depth } = row;
  const isDir = node.type === 'directory';
  const pad = 8 + depth * 14;
  const isVerity = node.name === '.verity' || node.path.startsWith('.verity/');
  const statusColor =
    node.status === 'added' ? 'var(--ok)' : node.status === 'modified' ? 'var(--mod)' : 'var(--t1)';

  const handleClick = (): void => {
    if (isDir) {
      onToggleExpand(node.path);
      return;
    }
    onSelectFile(node.path);
  };

  return (
    <button
      type="button"
      role="treeitem"
      aria-expanded={isDir ? expanded : undefined}
      aria-selected={selected}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={node.path}
      aria-label={isDir ? `${node.name} folder` : node.name}
      style={{
        width: '100%',
        height: FILE_TREE_ROW_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: `0 8px 0 ${pad}px`,
        border: 'none',
        borderRadius: 5,
        cursor: 'pointer',
        background: selected ? 'var(--acc-dim)' : hover ? 'var(--bg3)' : 'transparent',
        color: isDir ? (isVerity ? 'var(--acc)' : 'var(--t0)') : statusColor,
        textAlign: 'left',
      }}
    >
      {isDir ? (
        <Icon d={expanded ? IC.chevDown : IC.chevRight} size={12} stroke="var(--t2)" strokeWidth={2} />
      ) : (
        <span style={{ width: 12, flexShrink: 0 }} />
      )}
      <Icon d={isDir ? IC.folder : IC.file} size={14} stroke={isDir ? 'var(--t2)' : statusColor} />
      <span
        style={{
          fontSize: 12,
          fontFamily: 'var(--mono)',
          fontWeight: isDir ? 600 : 400,
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {node.name}
      </span>
      {node.status === 'added' ? (
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ok)', fontFamily: 'var(--mono)' }}>A</span>
      ) : null}
      {node.status === 'modified' ? (
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mod)', fontFamily: 'var(--mono)' }}>M</span>
      ) : null}
    </button>
  );
}
