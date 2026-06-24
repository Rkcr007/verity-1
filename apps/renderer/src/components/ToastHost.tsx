import { useToast } from '../store/toast-store.js';

const TONE_COLOR: Record<string, string> = {
  ok: 'var(--ok)',
  err: 'var(--err)',
  info: 'var(--acc)',
};

/**
 * ToastHost — fixed bottom-center notification stack (locked prototype).
 * Mount once in AppShell; call `useToast.getState().show(...)` from anywhere.
 */
export function ToastHost(): React.ReactElement | null {
  const toasts = useToast((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: 'var(--bg3)',
            border: '1px solid var(--b2)',
            borderRadius: 9,
            padding: '10px 16px',
            fontSize: 12.5,
            fontWeight: 500,
            color: 'var(--t0)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            animation: 'slideU 0.3s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: TONE_COLOR[toast.tone] ?? 'var(--ok)',
              flexShrink: 0,
            }}
          />
          {toast.message}
        </div>
      ))}
    </div>
  );
}
