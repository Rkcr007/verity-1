import type { PrerequisiteCheckDto } from '@verity/core/ipc';

interface PrerequisiteCheckListProps {
  readonly checks: readonly PrerequisiteCheckDto[];
  readonly onInstallToolchain?: () => void;
  readonly installBusy?: boolean;
}

/**
 * Prerequisite check list — wizard + settings (M3 E3-S1 T3).
 */
export function PrerequisiteCheckList({
  checks,
  onInstallToolchain,
  installBusy = false,
}: PrerequisiteCheckListProps): React.ReactElement {
  const hasMissing = checks.some((c) => !c.satisfied);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {checks.map((check) => (
        <div
          key={check.name}
          style={{
            display: 'flex',
            gap: 10,
            padding: '10px 12px',
            background: check.satisfied ? 'var(--ok-dim)' : 'rgba(239,91,91,0.08)',
            border: `1px solid ${check.satisfied ? 'rgba(67,181,129,0.3)' : 'rgba(239,91,91,0.35)'}`,
            borderRadius: 8,
            textAlign: 'left',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              marginTop: 5,
              flexShrink: 0,
              background: check.satisfied ? 'var(--ok)' : 'var(--err)',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t0)' }}>{check.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--t1)', marginTop: 2, lineHeight: '16px' }}>
              {check.message}
            </div>
            {!check.satisfied && check.guidance && (
              <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4, lineHeight: '15px' }}>
                {check.guidance}
              </div>
            )}
          </div>
        </div>
      ))}
      {hasMissing && onInstallToolchain ? (
        <button
          type="button"
          disabled={installBusy}
          onClick={onInstallToolchain}
          style={{
            marginTop: 4,
            height: 36,
            padding: '0 14px',
            border: '1px solid var(--acc)',
            borderRadius: 8,
            background: 'var(--acc-bg)',
            color: 'var(--acc)',
            fontSize: 12,
            fontWeight: 700,
            cursor: installBusy ? 'wait' : 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {installBusy ? 'Installing toolchain…' : 'One-click install toolchain'}
        </button>
      ) : null}
    </div>
  );
}
