import { IC, Icon } from '../../components/Icon.js';
import { useRouter } from '../../store/router-store.js';

/**
 * Welcome — onboarding gate (locked prototype). EPIC 0 ships the entry hero and
 * the two CTAs; the create-project wizard is built in EPIC 1 (M1).
 */
export function WelcomeScreen() {
  const go = useRouter((s) => s.go);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px 60px',
        background: 'radial-gradient(110% 90% at 75% 0%,#101725 0%,#0A0C10 58%)',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            background: 'linear-gradient(135deg,var(--acc),var(--ai))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 22px rgba(91,140,239,0.35)',
          }}
        >
          <Icon d={IC.shield} size={22} stroke="white" strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>Verity</div>
          <div style={{ fontSize: 12, color: 'var(--t2)' }}>
            AI-Native Test Engineering Workspace
          </div>
        </div>
      </div>

      <div style={{ fontSize: 34, lineHeight: '40px', fontWeight: 700, letterSpacing: -1, maxWidth: 600 }}>
        Work alongside a senior automation engineer that knows your repository.
      </div>
      <p style={{ fontSize: 15, lineHeight: '23px', color: 'var(--t1)', maxWidth: 540, marginTop: 18 }}>
        Connect a repo and Verity understands your framework, application, page objects and existing
        tests. Local-first. Framework-neutral. Git-native.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 34 }}>
        <button
          onClick={() => go('create')}
          style={{
            height: 46,
            padding: '0 22px',
            border: 'none',
            borderRadius: 10,
            background: 'linear-gradient(135deg,var(--acc),var(--ai))',
            color: 'white',
            fontSize: 14.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            boxShadow: '0 6px 22px rgba(91,140,239,0.3)',
          }}
        >
          <Icon d={IC.plus} size={17} stroke="white" strokeWidth={2} /> Connect a repository
        </button>
        <button
          onClick={() => go('workspace')}
          style={{
            height: 46,
            padding: '0 20px',
            border: '1px solid var(--b2)',
            borderRadius: 10,
            background: 'var(--bg2)',
            color: 'var(--t0)',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Open workspace <Icon d={IC.arrow} size={15} />
        </button>
      </div>
    </div>
  );
}
