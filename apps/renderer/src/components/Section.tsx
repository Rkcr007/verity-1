import type { ReactNode } from 'react';
import { IC, Icon } from './Icon.js';

/**
 * Section — collapsible sidebar section with header (locked prototype).
 */
export interface SectionProps {
  icon: string;
  title: string;
  right?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function Section({
  icon,
  title,
  right,
  open,
  onToggle,
  children,
}: SectionProps): React.ReactElement {
  return (
    <div style={{ borderBottom: '1px solid var(--b0)' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          border: 'none',
          background: 'transparent',
          color: 'var(--t1)',
        }}
      >
        <Icon d={open ? IC.chevDown : IC.chevRight} size={12} stroke="var(--t2)" strokeWidth={2} />
        <Icon d={icon} size={13} stroke="var(--t2)" />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            flex: 1,
            textAlign: 'left',
          }}
        >
          {title}
        </span>
        {right}
      </button>
      {open ? <div style={{ padding: '2px 6px 8px' }}>{children}</div> : null}
    </div>
  );
}
