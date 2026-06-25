import type { PrerequisiteReportDto } from '@verity/core/ipc';
import { Icon, IC } from '../../components/Icon.js';
import { PrerequisiteCheckList } from '../../components/PrerequisiteCheckList.js';

interface PrerequisiteGateModalProps {
  report: PrerequisiteReportDto;
  installBusy: boolean;
  onClose: () => void;
  onInstallToolchain: () => void;
  onOpenSettings: () => void;
}

/**
 * PrerequisiteGateModal — S-08 blocker when Run is clicked without a ready environment.
 */
export function PrerequisiteGateModal({
  report,
  installBusy,
  onClose,
  onInstallToolchain,
  onOpenSettings,
}: PrerequisiteGateModalProps): React.ReactElement {
  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 8, 12, 0.7)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prereq-gate-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 480,
          maxWidth: '100%',
          background: 'var(--bg1)',
          border: '1px solid var(--b2)',
          borderRadius: 14,
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 48,
            borderBottom: '1px solid var(--b0)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px',
          }}
        >
          <Icon d={IC.settings} size={17} stroke="var(--err)" />
          <span id="prereq-gate-title" style={{ fontSize: 14, fontWeight: 700 }}>
            Environment not ready (S-08)
          </span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prerequisite dialog"
            style={{
              width: 30,
              height: 30,
              border: 'none',
              background: 'var(--bg3)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <Icon d={IC.x} size={15} stroke="var(--t1)" />
          </button>
        </div>

        <div style={{ padding: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: '20px', margin: '0 0 14px' }}>
            Maven, JDK, or browser prerequisites are missing. Install the toolchain or fix your PATH
            before running tests.
          </p>
          <PrerequisiteCheckList
            checks={report.checks}
            onInstallToolchain={onInstallToolchain}
            installBusy={installBusy}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onOpenSettings}
              style={{
                height: 34,
                padding: '0 14px',
                border: '1px solid var(--b1)',
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--t1)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Open Settings
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 34,
                padding: '0 14px',
                border: 'none',
                borderRadius: 8,
                background: 'var(--acc)',
                color: 'white',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
