import type { SemanticTestDto, SemanticTestRunStatus } from '@verity/core/ipc';
import { IC, Icon } from '../../components/Icon.js';
import { Pill } from '../../components/Pill.js';
import { useSemanticStore } from '../../store/semantic-store.js';
import { formatAdapterName } from '../../utils/display.js';
import { semanticStatusColor, semanticStatusLabel } from '../../utils/semantic-status.js';

interface AiStudioReadOnlyPanelProps {
  test: SemanticTestDto | null;
  loading: boolean;
}

/**
 * Read-only AI Studio view for a selected semantic test (M2 E2-S3).
 * Full prompt/generate flow ships in M4.
 */
export function AiStudioReadOnlyPanel({
  test,
  loading,
}: AiStudioReadOnlyPanelProps): React.ReactElement {
  const tests = useSemanticStore((s) => s.tests);
  const status = test ? (tests.find((t) => t.slug === test.id)?.status ?? 'draft') : 'draft';
  return (
    <div
      style={{
        width: 330,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg1)',
        borderLeft: '1px solid var(--b0)',
      }}
    >
      <div
        style={{
          height: 34,
          borderBottom: '1px solid var(--b0)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 8,
          background: 'var(--ai-bg)',
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        <Icon d={IC.spark} size={14} stroke="var(--ai)" />
        AI Test Studio
        <Pill color="var(--t2)" background="var(--bg3)" border="var(--b1)" style={{ marginLeft: 4 }}>
          read-only
        </Pill>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {loading ? (
          <Placeholder message="Loading test…" />
        ) : !test ? (
          <Placeholder message="Select a semantic test from the left panel to inspect its steps." />
        ) : (
          <TestDetail test={test} status={status} />
        )}
      </div>
    </div>
  );
}

function Placeholder({ message }: { message: string }): React.ReactElement {
  return (
    <div style={{ color: 'var(--t2)', fontSize: 12.5, lineHeight: '18px', opacity: 0.85 }}>
      {message}
    </div>
  );
}

function TestDetail({
  test,
  status,
}: {
  test: SemanticTestDto;
  status: SemanticTestRunStatus;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{test.name}</div>
        <div style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
          {test.id}.yaml · {formatAdapterName(test.adapter)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Pill
          color={semanticStatusColor(status)}
          background="var(--bg3)"
          border="var(--b1)"
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: semanticStatusColor(status),
              display: 'inline-block',
            }}
          />
          {semanticStatusLabel(status)}
        </Pill>
        <Pill>{test.steps.length} steps</Pill>
        <Pill color="var(--t2)">{test.promptVersion}</Pill>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {test.steps.map((step) => (
          <div
            key={step.id}
            style={{
              padding: '10px 12px',
              background: 'var(--bg2)',
              border: '1px solid var(--b1)',
              borderRadius: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  background: 'var(--acc-dim)',
                  color: 'var(--acc)',
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: 'var(--mono)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {step.id}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{step.intent}</span>
              <span style={{ fontSize: 10, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
                {Math.round(step.confidence * 100)}%
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--t1)', lineHeight: '16px' }}>
              <div>
                <span style={{ color: 'var(--t2)' }}>Action: </span>
                {step.action}
              </div>
              <div style={{ marginTop: 4 }}>
                <span style={{ color: 'var(--t2)' }}>Expected: </span>
                {step.expected}
              </div>
              {step.locators.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {step.locators.map((loc) => (
                    <Pill key={loc.ref} color="var(--t2)" style={{ fontSize: 10 }}>
                      {loc.strategy}:{loc.value.slice(0, 20)}
                    </Pill>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '10px 12px',
          background: 'var(--bg0)',
          border: '1px dashed var(--b1)',
          borderRadius: 8,
          fontSize: 11.5,
          color: 'var(--t2)',
          lineHeight: '16px',
        }}
      >
        Prompt console and step generation ship in M4. This view is read-only for MVP.
      </div>
    </div>
  );
}
