import type { CSSProperties, ReactNode } from 'react';

/**
 * Pill — generic colored tag from the locked MVP prototype.
 */
export interface PillProps {
  children: ReactNode;
  color?: string;
  background?: string;
  border?: string;
  style?: CSSProperties;
}

export function Pill({
  children,
  color = 'var(--t1)',
  background = 'var(--bg3)',
  border = 'var(--b1)',
  style,
}: PillProps): React.ReactElement {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        background,
        border: `1px solid ${border}`,
        borderRadius: 20,
        fontSize: 10.5,
        fontWeight: 600,
        color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
