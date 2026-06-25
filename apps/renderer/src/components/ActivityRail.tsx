import { IC, Icon } from './Icon.js';
import { useRouter, type Route } from '../store/router-store.js';

/**
 * ActivityRail (architecture §2.2, locked prototype). The 52px left navigation
 * present on all chrome screens. Active route gets the accent indicator bar.
 */
const NAV: ReadonlyArray<{ id: Route; icon: string; label: string }> = [
  { id: 'workspace', icon: IC.ws, label: 'Workspace' },
  { id: 'projects', icon: IC.proj, label: 'Projects' },
  { id: 'executions', icon: IC.run, label: 'Executions' },
  { id: 'memory', icon: IC.mem, label: 'AI Memory' },
  { id: 'settings', icon: IC.settings, label: 'Settings' },
];

export function ActivityRail() {
  const route = useRouter((s) => s.route);
  const go = useRouter((s) => s.go);

  return (
    <nav
      aria-label="Main navigation"
      style={{
        width: 52,
        flexShrink: 0,
        background: 'var(--bg0)',
        borderRight: '1px solid var(--b0)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'calc(10px + var(--titlebar-inset))',
        paddingBottom: 10,
        gap: 3,
        zIndex: 30,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Home — back to start"
        onClick={() => go('welcome')}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            go('welcome');
          }
        }}
        title="Home — back to start"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'linear-gradient(135deg,var(--acc),var(--ai))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
          cursor: 'pointer',
          boxShadow: '0 0 16px rgba(91,140,239,0.3)',
        }}
      >
        <Icon d={IC.shield} size={17} stroke="white" strokeWidth={2} />
      </div>

      {NAV.map((n) => {
        const on = route === n.id;
        return (
          <button
            key={n.id}
            type="button"
            title={n.label}
            aria-label={n.label}
            aria-current={on ? 'page' : undefined}
            onClick={() => go(n.id)}
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              border: 'none',
              borderRadius: 9,
              background: on ? 'var(--acc-dim)' : 'transparent',
              color: on ? 'var(--acc)' : 'var(--t2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all .15s',
            }}
          >
            <Icon d={n.icon} size={19} />
            {on && (
              <div
                style={{
                  position: 'absolute',
                  left: -10,
                  top: 9,
                  width: 3,
                  height: 20,
                  borderRadius: 3,
                  background: 'var(--acc)',
                }}
              />
            )}
          </button>
        );
      })}

      <div style={{ flex: 1 }} />
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'linear-gradient(135deg,#5B8CEF,#A472F0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: 'white',
        }}
      >
        R
      </div>
    </nav>
  );
}
