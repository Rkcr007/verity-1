import type { AdapterId } from '@verity/core';
import type { FrameworkCatalogEntryDto, FrameworkRecommendationDto, EnvironmentSetupResultDto } from '@verity/core/ipc';
import { IC, Icon } from './Icon.js';
import { Pill } from './Pill.js';

interface FrameworkCatalogPickerProps {
  readonly catalog: readonly FrameworkCatalogEntryDto[];
  readonly recommendation: FrameworkRecommendationDto | null;
  readonly selectedAdapterId: AdapterId;
  readonly onSelect: (adapterId: AdapterId) => void;
}

const TIER_LABEL: Record<FrameworkCatalogEntryDto['enterpriseTier'], string> = {
  leader: 'Enterprise leader',
  standard: 'Industry standard',
  emerging: 'Growing adoption',
};

/**
 * Enterprise framework picker with intelligence recommendation (M1.6 greenfield).
 */
export function FrameworkCatalogPicker({
  catalog,
  recommendation,
  selectedAdapterId,
  onSelect,
}: FrameworkCatalogPickerProps): React.ReactElement {
  const recommendedId = recommendation?.recommended.adapterId;

  return (
    <div style={{ marginBottom: 20 }}>
      {recommendation ? (
        <div
          style={{
            marginBottom: 14,
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--ai-dim)',
            border: '1px solid rgba(167,139,250,0.25)',
            fontSize: 12.5,
            lineHeight: '18px',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--ai)', marginBottom: 6 }}>
            Intelligence recommends {recommendation.recommended.displayName}
            {recommendation.source === 'llm' ? (
              <span style={{ fontWeight: 600, color: 'var(--t2)', marginLeft: 6 }}>(AI)</span>
            ) : null}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--t1)' }}>
            {recommendation.reasons.slice(0, 3).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {catalog.map((entry) => {
          const selected = entry.adapterId === selectedAdapterId;
          const isRecommended = entry.adapterId === recommendedId;
          const disabled = !entry.scaffoldSupported;

          return (
            <button
              key={entry.adapterId}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(entry.adapterId)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                padding: '13px 14px',
                background: selected ? 'var(--acc-bg)' : 'var(--bg2)',
                border: `1.5px solid ${selected ? 'var(--acc)' : 'var(--b1)'}`,
                borderRadius: 10,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.55 : 1,
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{entry.displayName}</span>
                {isRecommended ? (
                  <Pill color="var(--ai)" background="var(--ai-dim)" border="rgba(167,139,250,0.35)">
                    Recommended
                  </Pill>
                ) : null}
                {entry.maturity === 'available' ? (
                  <Pill color="var(--ok)" background="rgba(52,211,153,0.12)" border="rgba(52,211,153,0.35)">
                    Ready
                  </Pill>
                ) : (
                  <Pill color="var(--t2)">Coming soon</Pill>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t2)' }}>
                  {TIER_LABEL[entry.enterpriseTier]}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 6 }}>
                {entry.language} · {entry.buildTool} · {entry.testRunner} · v{entry.latestVersion}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--t1)', marginTop: 6, lineHeight: '17px' }}>
                {entry.adoptionNote}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                {entry.dependencies.map((d) => (
                  <Pill key={d} color="var(--t2)">
                    {d}
                  </Pill>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface EnvironmentSetupListProps {
  readonly setup: EnvironmentSetupResultDto;
}

/**
 * Shows auto-setup progress after greenfield scaffold (Maven, browsers).
 */
export function EnvironmentSetupList({ setup }: EnvironmentSetupListProps): React.ReactElement {
  return (
    <div style={{ maxWidth: 420, margin: '16px auto 0', textAlign: 'left' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: 'var(--t2)',
          marginBottom: 8,
        }}
      >
        Auto-setup {setup.ready ? '— ready' : '— review items below'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {setup.steps.map((step) => (
          <div
            key={step.name}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              background: 'var(--bg2)',
              border: '1px solid var(--b1)',
              borderRadius: 8,
            }}
          >
            <Icon
              d={step.status === 'ok' ? IC.check : IC.x}
              size={14}
              stroke={step.status === 'ok' ? 'var(--ok)' : step.status === 'failed' ? 'var(--err)' : 'var(--t2)'}
              strokeWidth={2.5}
            />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{step.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--t2)', marginTop: 2, lineHeight: '16px' }}>
                {step.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
