import type { DiffLineDto } from '@verity/core/ipc';

const LINE_BG: Record<DiffLineDto['kind'], string> = {
  '+': 'rgba(67, 181, 129, 0.1)',
  '-': 'rgba(229, 100, 94, 0.1)',
  ' ': 'transparent',
};

const LINE_COLOR: Record<DiffLineDto['kind'], string> = {
  '+': 'var(--ok)',
  '-': 'var(--err)',
  ' ': 'var(--t3)',
};

/**
 * DiffViewer — inline unified diff renderer for CommitModal.
 */
export function DiffViewer({ lines }: { lines: readonly DiffLineDto[] }): React.ReactElement {
  if (lines.length === 0) {
    return (
      <div style={{ padding: 12, color: 'var(--t2)', fontSize: 12 }}>
        No diff available for this file.
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px 0',
        fontFamily: 'var(--mono)',
        fontSize: 12,
        lineHeight: '19px',
      }}
    >
      {lines.map((line, index) => (
        <div
          key={`${index}-${line.kind}`}
          style={{
            display: 'flex',
            background: LINE_BG[line.kind],
          }}
        >
          <span
            style={{
              width: 26,
              textAlign: 'center',
              color: LINE_COLOR[line.kind],
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            {line.kind}
          </span>
          <span
            style={{
              color: line.kind === '+' ? 'var(--t0)' : line.kind === '-' ? 'var(--t1)' : 'var(--t2)',
              whiteSpace: 'pre',
            }}
          >
            {line.content}
          </span>
        </div>
      ))}
    </div>
  );
}
