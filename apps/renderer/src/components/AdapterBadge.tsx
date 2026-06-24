/**
 * AdapterBadge — framework + version pill from the locked prototype.
 */
export interface AdapterBadgeProps {
  framework?: string;
  version?: string;
  small?: boolean;
}

export function AdapterBadge({
  framework = 'Playwright Java',
  version = '1.48',
  small = false,
}: AdapterBadgeProps): React.ReactElement {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: small ? '2px 8px' : '3px 10px',
        background: 'var(--acc-dim)',
        border: '1px solid rgba(91,140,239,0.25)',
        borderRadius: 6,
        fontSize: small ? 10.5 : 11.5,
        fontWeight: 600,
        color: 'var(--acc)',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'var(--acc)',
        }}
      />
      {framework}
      {version ? (
        <span
          style={{
            color: 'rgba(91,140,239,0.6)',
            fontFamily: 'var(--mono)',
            fontWeight: 500,
          }}
        >
          {version}
        </span>
      ) : null}
    </span>
  );
}
