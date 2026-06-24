import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@verity/core';
import type { SemanticTestSummaryDto } from '@verity/core/ipc';
import { AdapterBadge } from '../../components/AdapterBadge.js';
import { IC } from '../../components/Icon.js';
import { Pill } from '../../components/Pill.js';
import { Section } from '../../components/Section.js';
import { on } from '../../ipc/client.js';
import { useSemanticStore } from '../../store/semantic-store.js';
import { formatFramework } from '../../utils/display.js';
import { semanticStatusColor } from '../../utils/semantic-status.js';

interface WorkspaceLeftPanelProps {
  project: Project;
  selectedSlug: string | null;
  onSelectTest: (slug: string) => void;
}

/**
 * Workspace left panel (M2 E2-S3) — framework summary + semantic test list.
 */
export function WorkspaceLeftPanel({
  project,
  selectedSlug,
  onSelectTest,
}: WorkspaceLeftPanelProps): React.ReactElement {
  const tests = useSemanticStore((s) => s.tests);
  const loading = useSemanticStore((s) => s.loading);
  const loadTests = useSemanticStore((s) => s.loadTests);

  const [secOpen, setSecOpen] = useState({ fw: true, sem: true });

  const refresh = useCallback(() => {
    void loadTests(project.id);
  }, [loadTests, project.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const offCreated = on('semantic.test.created', (event) => {
      if (event.payload.projectId === project.id) refresh();
    });
    const offUpdated = on('semantic.test.updated', (event) => {
      if (event.payload.projectId === project.id) refresh();
    });
    return () => {
      offCreated();
      offUpdated();
    };
  }, [project.id, refresh]);

  const fw = formatFramework(project.framework);

  return (
    <div
      style={{
        width: 248,
        flexShrink: 0,
        borderRight: '1px solid var(--b0)',
        background: 'var(--bg1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Section
          icon={IC.layers}
          title="Framework"
          open={secOpen.fw}
          onToggle={() => setSecOpen((s) => ({ ...s, fw: !s.fw }))}
        >
          <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AdapterBadge framework={fw.name} version={fw.version} small />
            <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: '15px' }}>
              {fw.name} · {fw.version}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: '15px' }}>
              {project.stats.pages} pages · {project.stats.tests} tests indexed
            </div>
          </div>
        </Section>

        <Section
          icon={IC.spark}
          title="Semantic Tests"
          right={
            <Pill color="var(--acc)" background="var(--acc-dim)" border="rgba(91,140,239,0.25)">
              {tests.length}
            </Pill>
          }
          open={secOpen.sem}
          onToggle={() => setSecOpen((s) => ({ ...s, sem: !s.sem }))}
        >
          {loading && tests.length === 0 ? (
            <div style={{ padding: '8px', fontSize: 11.5, color: 'var(--t2)' }}>Loading…</div>
          ) : tests.length === 0 ? (
            <div style={{ padding: '8px', fontSize: 11.5, color: 'var(--t2)', lineHeight: '16px' }}>
              No semantic tests yet. AI Test Studio (M4) will create tests here as{' '}
              <span style={{ fontFamily: 'var(--mono)' }}>.verity/tests/*.yaml</span>.
            </div>
          ) : (
            tests.map((test) => (
              <SemanticTestRow
                key={test.slug}
                test={test}
                selected={selectedSlug === test.slug}
                onSelect={() => onSelectTest(test.slug)}
              />
            ))
          )}
        </Section>
      </div>
    </div>
  );
}

function SemanticTestRow({
  test,
  selected,
  onSelect,
}: {
  test: SemanticTestSummaryDto;
  selected: boolean;
  onSelect: () => void;
}): React.ReactElement {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 8px',
        borderRadius: 5,
        border: 'none',
        cursor: 'pointer',
        background: selected ? 'var(--acc-dim)' : hover ? 'var(--bg3)' : 'transparent',
        color: 'var(--t0)',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: semanticStatusColor(test.status),
          flexShrink: 0,
        }}
        title={test.status}
      />
      <span
        style={{
          flex: 1,
          fontSize: 11.5,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {test.name}
      </span>
      <span style={{ fontSize: 10, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
        {test.stepCount}
      </span>
    </button>
  );
}
