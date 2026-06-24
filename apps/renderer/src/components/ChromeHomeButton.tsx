import { IC, Icon } from './Icon.js';
import { useRouter } from '../store/router-store.js';

interface ChromeHomeButtonProps {
  readonly label?: string;
}

/**
 * Returns to the Welcome / start screen from any chrome route.
 */
export function ChromeHomeButton({ label = 'Home' }: ChromeHomeButtonProps): React.ReactElement {
  const go = useRouter((s) => s.go);

  return (
    <button
      type="button"
      title="Back to start"
      onClick={() => go('welcome')}
      style={{
        height: 28,
        padding: label ? '0 10px' : '0 8px',
        border: '1px solid var(--b1)',
        borderRadius: 7,
        background: 'var(--bg2)',
        color: 'var(--t1)',
        fontSize: 11.5,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
      }}
    >
      <Icon d={IC.home} size={13} stroke="var(--t1)" />
      {label}
    </button>
  );
}

/**
 * Draggable strip for moving the frame on macOS (hiddenInset title bar).
 */
export function TitleBarDragRegion(): React.ReactElement {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        left: 52,
        right: 0,
        height: 'var(--titlebar-inset)',
        WebkitAppRegion: 'drag',
        zIndex: 20,
      } as React.CSSProperties}
    />
  );
}
