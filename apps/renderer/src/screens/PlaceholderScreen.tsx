import { IC, Icon } from '../components/Icon.js';

/**
 * PlaceholderScreen — a labeled stub for screens whose behavior is delivered in
 * a later epic (Projects/Create/Executions/Memory/Settings). Keeps the shell
 * navigable end-to-end in EPIC 0 without faking functionality.
 */
export function PlaceholderScreen({ title, epic }: { title: string; epic: string }) {
  return (
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
  );
}
