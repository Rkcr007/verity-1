import type { GitChangeDto } from '@verity/core/ipc';

const TYPE_COLOR: Record<GitChangeDto['type'], string> = {
  A: 'var(--ok)',
  M: 'var(--mod, #E0A33A)',
  D: 'var(--err)',
  U: 'var(--err)',
};

/**
 * GitChangeRow — single changed file in the left panel Git Changes section.
 */
export function GitChangeRow({
  change,
  onSelect,
}: {
  change: GitChangeDto;
  onSelect: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 8px',
        borderRadius: 5,
        border: 'none',
        background: 'transparent',
        color: 'var(--t0)',
        textAlign: 'left',
        cursor: 'pointer',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--bg3)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent';
      }}
    >
      <span
        style={{
          width: 13,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'var(--mono)',
          color: TYPE_COLOR[change.type],
          flexShrink: 0,
        }}
      >
        {change.type}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 11.5,
          fontFamily: 'var(--mono)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={change.path}
      >
        {change.fileName}
      </span>
    </button>
  );
}
