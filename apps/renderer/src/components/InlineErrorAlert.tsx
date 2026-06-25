import type { ReactNode } from 'react';

type AlertTone = 'warn' | 'err' | 'info';

const TONE: Record<AlertTone, { bg: string; border: string; accent: string }> = {
  warn: {
    bg: 'rgba(224, 163, 58, 0.1)',
    border: 'rgba(224, 163, 58, 0.28)',
    accent: 'var(--mod, #E0A33A)',
  },
  err: {
    bg: 'rgba(229, 100, 94, 0.1)',
    border: 'rgba(229, 100, 94, 0.28)',
    accent: 'var(--err)',
  },
  info: {
    bg: 'rgba(91, 140, 239, 0.08)',
    border: 'rgba(91, 140, 239, 0.25)',
    accent: 'var(--acc)',
  },
};

/** Compact inline alert for wizard panels and section bodies (M7 S-01..S-03). */
export function InlineErrorAlert({
  code,
  title,
  message,
  tone = 'warn',
  action,
}: {
  code?: string;
  title: string;
  message: string;
  tone?: AlertTone;
  action?: ReactNode;
}): React.ReactElement {
  const style = TONE[tone];
  return (
    <div
      role="alert"
      style={{
        marginBottom: 14,
        padding: '10px 12px',
        borderRadius: 9,
        background: style.bg,
        border: `1px solid ${style.border}`,
        fontSize: 12,
        lineHeight: '16px',
      }}
    >
      <div style={{ color: style.accent, fontWeight: 600, marginBottom: 4 }}>
        {code ? `${code} — ${title}` : title}
      </div>
      <div style={{ color: 'var(--t1)' }}>{message}</div>
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}
