import { Icon } from './Icon.js';
import { Pill } from './Pill.js';

export interface WelcomeEntryCardProps {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly journey?: readonly string[];
  readonly badge?: string;
  readonly accent?: boolean;
  readonly onClick: () => void;
}

/**
 * Welcome entry path card — shows journey steps so users know what each option delivers (M1.6).
 */
export function WelcomeEntryCard({
  icon,
  title,
  description,
  journey,
  badge,
  accent = false,
  onClick,
}: WelcomeEntryCardProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        padding: '17px 16px',
        background: accent ? 'var(--acc-bg)' : 'var(--bg2)',
        border: `1.5px solid ${accent ? 'var(--acc)' : 'var(--b1)'}`,
        borderRadius: 13,
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        minHeight: journey?.length ? 188 : 148,
      }}
      onMouseEnter={(e) => {
        if (!accent) {
          e.currentTarget.style.borderColor = 'var(--b2)';
          e.currentTarget.style.background = 'var(--bg3)';
        }
      }}
      onMouseLeave={(e) => {
        if (!accent) {
          e.currentTarget.style.borderColor = 'var(--b1)';
          e.currentTarget.style.background = 'var(--bg2)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginBottom: 11 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: 'var(--bg3)',
            border: '1px solid var(--b1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon d={icon} size={17} stroke={accent ? 'var(--acc)' : 'var(--t1)'} />
        </div>
        {badge ? (
          <Pill color="var(--ai)" background="var(--ai-dim)" border="rgba(167,139,250,0.35)">
            {badge}
          </Pill>
        ) : null}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--t0)' }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--t1)', lineHeight: '17px', marginBottom: journey?.length ? 10 : 0 }}>
        {description}
      </div>
      {journey?.length ? (
        <ol
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 11.5,
            color: 'var(--t2)',
            lineHeight: '16px',
            width: '100%',
          }}
        >
          {journey.map((step, i) => (
            <li key={step} style={{ marginBottom: i < journey.length - 1 ? 2 : 0 }}>
              {step}
            </li>
          ))}
        </ol>
      ) : null}
    </button>
  );
}
