import { useEffect } from 'react';
import type { Project } from '@verity/core';
import { ChromeScreenHeader } from '../../components/ChromeScreenHeader.js';
import { IC, Icon } from '../../components/Icon.js';
import { Pill } from '../../components/Pill.js';
import { useExecutionStore } from '../../store/execution-store.js';

/**
 * Executions screen (M5) — list and detail of test runs.
 */
export function ExecutionsScreen({ project }: { project: Project | null }): React.ReactElement {
  const runs = useExecutionStore((s) => s.runs);
  const loading = useExecutionStore((s) => s.loading);
  const loadRuns = useExecutionStore((s) => s.loadRuns);

  useEffect(() => {
    if (project) void loadRuns(project.id);
  }, [project, loadRuns]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ChromeScreenHeader>
        <Icon d={IC.run} size={16} stroke="var(--acc)" />
        Executions
      </ChromeScreenHeader>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {!project ? (
          <div style={{ color: 'var(--t2)', fontSize: 13 }}>Open a project to view runs.</div>
        ) : loading && runs.length === 0 ? (
          <div style={{ color: 'var(--t2)', fontSize: 13 }}>Loading runs…</div>
        ) : runs.length === 0 ? (
          <div style={{ color: 'var(--t2)', fontSize: 13, lineHeight: '20px' }}>
            No executions yet. Apply a semantic test in AI Studio, then run it from the workspace.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {runs.map((run) => (
              <div
                key={run.id}
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg1)',
                  border: '1px solid var(--b1)',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{run.semanticTestName}</span>
                  <StatusPill status={run.status} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
                  {run.semanticTestSlug} · {run.branch} · {formatTime(run.startedAt)}
                  {run.completedAt ? ` · ${run.completedAt - run.startedAt}ms` : ''}
                </div>
                {run.steps.length > 0 ? (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {run.steps.map((step) => (
                      <div
                        key={step.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 11.5,
                          color: 'var(--t1)',
                        }}
                      >
                        <StepDot status={step.status} />
                        <span style={{ flex: 1 }}>{step.label}</span>
                        {step.durationMs != null ? (
                          <span style={{ fontFamily: 'var(--mono)', color: 'var(--t2)', fontSize: 10 }}>
                            {step.durationMs}ms
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {run.classification ? (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: 'var(--mod)',
                      lineHeight: '15px',
                    }}
                  >
                    {run.classification.summary}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }): React.ReactElement {
  const color =
    status === 'passed' ? 'var(--ok)' : status === 'running' ? 'var(--acc)' : 'var(--err)';
  return (
    <Pill color={color} background="var(--bg3)" border="var(--b1)">
      {status}
    </Pill>
  );
}

function StepDot({ status }: { status: string }): React.ReactElement {
  const color =
    status === 'passed'
      ? 'var(--ok)'
      : status === 'failed'
        ? 'var(--err)'
        : status === 'running'
          ? 'var(--acc)'
          : 'var(--t3)';
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}
