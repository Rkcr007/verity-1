import { IC, Icon } from '../components/Icon.js';
import { ChromeScreenHeader } from '../components/ChromeScreenHeader.js';

/**
 * PlaceholderScreen — a labeled stub for screens whose behavior is delivered in
 * a later epic (Executions). Keeps the shell navigable end-to-end without faking functionality.
 */
export function PlaceholderScreen({ title, epic }: { title: string; epic: string }): React.ReactElement {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ChromeScreenHeader>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--t2)' }}>{epic}</span>
      </ChromeScreenHeader>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          background: 'var(--bg1)',
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 14,
            background: 'var(--bg3)',
            border: '1px solid var(--b1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon d={IC.spark} size={26} stroke="var(--t2)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>{title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--t2)', maxWidth: 320, lineHeight: '18px' }}>
            Foundation shell in place. This screen is delivered in {epic}.
          </div>
        </div>
      </div>
    </div>
  );
}
