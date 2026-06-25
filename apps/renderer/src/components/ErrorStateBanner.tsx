import type { ReactNode } from 'react';

type ErrorStateTone = 'warn' | 'err' | 'info';

const TONE_STYLE: Record<ErrorStateTone, { bg: string; border: string; color: string }> = {
  warn: {
    bg: 'rgba(224, 163, 58, 0.12)',
    border: 'rgba(224, 163, 58, 0.25)',
    color: 'var(--mod, #E0A33A)',
  },
  err: {
    bg: 'rgba(229, 100, 94, 0.12)',
    border: 'rgba(229, 100, 94, 0.3)',
    color: 'var(--err)',
  },
  info: {
    bg: 'rgba(91, 140, 239, 0.1)',
    border: 'rgba(91, 140, 239, 0.25)',
    color: 'var(--acc)',
  },
};

/**
 * ErrorStateBanner — shared inline alert for M7 missing states (S-04, S-08, etc.).
 */
export function ErrorStateBanner({
  code,
  title,
  message,
  tone = 'warn',
  action,
}: {
  code?: string;
  title: string;
  message: string;
  tone?: ErrorStateTone;
  action?: ReactNode;
}): React.ReactElement {
  const style = TONE_STYLE[tone];

  return (
    <div
      style={{
        flexShrink: 0,
        padding: '8px 14px',
        background: style.bg,
        borderBottom: `1px solid ${style.border}`,
        color: style.color,
        fontSize: 12,
        lineHeight: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        {code ? (
          <strong>
            {code} — {title}
          </strong>
        ) : (
          <strong>{title}</strong>
        )}{' '}
        <span style={{ color: 'var(--t1)' }}>{message}</span>
      </div>
      {action}
    </div>
  );
}
