import { useCallback, useEffect, useState } from 'react';
import type { AppUpdateStatusDto } from '@verity/core/ipc';
import { invoke } from '../ipc/client.js';

/**
 * Top-of-app banner when a packaged update is available or ready (M7).
 */
export function UpdateBanner(): React.ReactElement | null {
  const [status, setStatus] = useState<AppUpdateStatusDto>({ state: 'unavailable' });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    const next = await invoke('app:get-update-status', undefined);
    setStatus(next);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void invoke('app:check-for-updates', undefined).then(setStatus);
    }, 6 * 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  if (status.state === 'unavailable' || status.state === 'idle' || status.state === 'checking') {
    return null;
  }

  if (status.state === 'error') {
    return null;
  }

  const handlePrimary = async (): Promise<void> => {
    setBusy(true);
    try {
      if (status.state === 'available') {
        const next = await invoke('app:download-update', undefined);
        setStatus(next);
      } else if (status.state === 'ready') {
        await invoke('app:install-update', undefined);
      }
    } finally {
      setBusy(false);
    }
  };

  const primaryLabel =
    status.state === 'ready' ? 'Restart to update' : status.state === 'downloading' ? 'Downloading…' : 'Download update';

  return (
    <div
      role="status"
      style={{
        flexShrink: 0,
        padding: '8px 14px',
        background: 'rgba(91, 140, 239, 0.12)',
        borderBottom: '1px solid rgba(91, 140, 239, 0.25)',
        color: 'var(--acc)',
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ flex: 1, color: 'var(--t1)' }}>
        {status.message ?? (status.version ? `Verity ${status.version} is available` : 'Update available')}
      </span>
      {status.state !== 'downloading' ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handlePrimary()}
          style={{
            height: 28,
            padding: '0 12px',
            borderRadius: 6,
            border: '1px solid rgba(91, 140, 239, 0.4)',
            background: 'var(--acc-dim)',
            color: 'var(--acc)',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {primaryLabel}
        </button>
      ) : null}
    </div>
  );
}
