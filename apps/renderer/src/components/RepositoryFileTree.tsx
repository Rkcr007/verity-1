import { useState } from 'react';
import type { FileNode } from '@verity/core/ipc';
import { IC, Icon } from './Icon.js';

export interface RepositoryFileTreeProps {
  nodes: readonly FileNode[];
  expandedPaths: ReadonlySet<string>;
  selectedPath: string | null;
  depth?: number;
  onToggleExpand: (path: string) => void;
  onSelectFile: (path: string) => void;
}

/**
 * IDE-style repository explorer (Cursor / VS Code pattern).
 */
export function RepositoryFileTree({
  nodes,
  expandedPaths,
  selectedPath,
  depth = 0,
  onToggleExpand,
  onSelectFile,
}: RepositoryFileTreeProps): React.ReactElement {
  return (
    <>
      {nodes.map((node) => (
        <FileTreeRow
          key={node.path}
          node={node}
          depth={depth}
          expanded={expandedPaths.has(node.path)}
          selected={selectedPath === node.path}
          expandedPaths={expandedPaths}
          selectedPath={selectedPath}
          onToggleExpand={onToggleExpand}
          onSelectFile={onSelectFile}
        />
      ))}
    </>
  );
}

function FileTreeRow({
  node,
  depth,
  expanded,
  selected,
  expandedPaths,
  selectedPath,
  onToggleExpand,
  onSelectFile,
}: {
  node: FileNode;
  depth: number;
  expanded: boolean;
  selected: boolean;
  expandedPaths: ReadonlySet<string>;
  selectedPath: string | null;
  onToggleExpand: (path: string) => void;
  onSelectFile: (path: string) => void;
}): React.ReactElement {
  const [hover, setHover] = useState(false);
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
    <>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={node.path}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: `3px 8px 3px ${pad}px`,
          border: 'none',
          borderRadius: 5,
          cursor: 'pointer',
          background: selected ? 'var(--acc-dim)' : hover ? 'var(--bg3)' : 'transparent',
          color: isDir ? (isVerity ? 'var(--acc)' : 'var(--t0)') : statusColor,
          textAlign: 'left',
        }}
      >
        {isDir ? (
          <Icon
            d={expanded ? IC.chevDown : IC.chevRight}
            size={12}
            stroke="var(--t2)"
            strokeWidth={2}
          />
        ) : (
          <span style={{ width: 12, flexShrink: 0 }} />
        )}
        <Icon
          d={isDir ? IC.folder : IC.page}
          size={14}
          stroke={isDir ? 'var(--t2)' : statusColor}
        />
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
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ok)', fontFamily: 'var(--mono)' }}>
            A
          </span>
        ) : null}
        {node.status === 'modified' ? (
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mod)', fontFamily: 'var(--mono)' }}>
            M
          </span>
        ) : null}
      </button>
      {isDir && expanded && node.children && node.children.length > 0 ? (
        <RepositoryFileTree
          nodes={node.children}
          expandedPaths={expandedPaths}
          selectedPath={selectedPath}
          depth={depth + 1}
          onToggleExpand={onToggleExpand}
          onSelectFile={onSelectFile}
        />
      ) : null}
    </>
  );
}
