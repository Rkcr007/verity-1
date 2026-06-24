import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@verity/core';
import type {
  BusinessFlowDto,
  IntelligenceSummaryDto,
  LocatorDto,
  PageDto,
  RepositoryIndexDto,
} from '@verity/core/ipc';
import { AdapterBadge } from '../../components/AdapterBadge.js';
import { IC, Icon } from '../../components/Icon.js';
import { Pill } from '../../components/Pill.js';
import { invoke } from '../../ipc/client.js';
import { on } from '../../ipc/client.js';
import { useRouter } from '../../store/router-store.js';
import { formatFramework, formatRepoSlug } from '../../utils/display.js';

type MemoryTab = 'pages' | 'flows' | 'locators' | 'intel';

const TABS: ReadonlyArray<{ id: MemoryTab; label: string }> = [
  { id: 'pages', label: 'Detected Pages' },
  { id: 'flows', label: 'Business Flows' },
  { id: 'locators', label: 'Known Locators' },
  { id: 'intel', label: 'Repository Intelligence' },
];

/**
 * AI Memory screen (M1 E1-S6) — inspect repository intelligence index.
 */
export function MemoryScreen({ project }: { project: Project | null }): React.ReactElement {
  const go = useRouter((s) => s.go);
  const [tab, setTab] = useState<MemoryTab>('pages');
  const [summary, setSummary] = useState<IntelligenceSummaryDto | null>(null);
  const [index, setIndex] = useState<RepositoryIndexDto | null>(null);
  const [pages, setPages] = useState<readonly PageDto[]>([]);
  const [flows, setFlows] = useState<readonly BusinessFlowDto[]>([]);
  const [locators, setLocators] = useState<readonly LocatorDto[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!project) return;
    setLoading(true);
    try {
      const [sum, idx, pg, fl, loc] = await Promise.all([
        invoke('intelligence:get-summary', { projectId: project.id }),
        invoke('intelligence:get-index', { projectId: project.id }),
        invoke('intelligence:get-pages', { projectId: project.id }),
        invoke('intelligence:get-flows', { projectId: project.id }),
        invoke('intelligence:get-locators', { projectId: project.id }),
      ]);
      setSummary(sum);
      setIndex(idx);
      setPages(pg);
      setFlows(fl);
      setLocators(loc);
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!project) return;
    const off = on('repository.index.updated', (event) => {
      if (event.payload.projectId === project.id) void load();
    });
    return off;
  }, [project, load]);

  const fw = project ? formatFramework(project.framework) : null;
  const score = summary?.understandingScore ?? project?.stats.understandingScore ?? 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header
        style={{
          height: 48,
          borderBottom: '1px solid var(--b0)',
          background: 'var(--bg1)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <Icon d={IC.mem} size={16} stroke="var(--ai)" />
        <span style={{ fontSize: 14, fontWeight: 700 }}>AI Memory</span>
        {project && (
          <span style={{ fontSize: 12, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
            {formatRepoSlug(project)}
          </span>
        )}
        <Pill color="var(--ai)" background="var(--ai-dim)" border="rgba(164,114,240,0.25)">
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--ai)',
              display: 'inline-block',
            }}
          />
          learning
        </Pill>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => go('workspace')}
          style={{
            height: 30,
            padding: '0 12px',
            background: 'var(--bg2)',
            border: '1px solid var(--b1)',
            borderRadius: 7,
            color: 'var(--t1)',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon d={IC.ws} size={13} />
          Workspace
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {!project ? (
          <EmptyState message="Open a workspace to inspect AI Memory." onAction={() => go('projects')} />
        ) : loading && !summary ? (
          <div style={{ color: 'var(--t2)', fontSize: 13 }}>Loading repository intelligence…</div>
        ) : (
          <>
            <StatsGrid
              pages={summary?.pageCount ?? 0}
              components={summary?.componentCount ?? 0}
              flows={summary?.flowCount ?? 0}
              locators={summary?.locatorCount ?? 0}
            />

            <div
              style={{
                display: 'flex',
                gap: 4,
                marginBottom: 14,
                borderBottom: '1px solid var(--b0)',
              }}
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderBottom: `2px solid ${tab === t.id ? 'var(--ai)' : 'transparent'}`,
                    background: 'transparent',
                    color: tab === t.id ? 'var(--t0)' : 'var(--t2)',
                    fontSize: 12.5,
                    fontWeight: tab === t.id ? 600 : 500,
                    marginBottom: -1,
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'pages' && <PagesTab pages={pages} />}
            {tab === 'flows' && <FlowsTab flows={flows} />}
            {tab === 'locators' && <LocatorsTab locators={locators} />}
            {tab === 'intel' && (
              <IntelTab
                score={score}
                frameworkName={fw?.name ?? '—'}
                frameworkVersion={fw?.version ?? '—'}
                conventions={index?.conventions ?? {}}
                indexedAt={index?.indexedAt ?? 0}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatsGrid({
  pages,
  components,
  flows,
  locators,
}: {
  pages: number;
  components: number;
  flows: number;
  locators: number;
}): React.ReactElement {
  const items = [
    { label: 'Pages', value: pages, icon: IC.page },
    { label: 'Components', value: components, icon: IC.layers },
    { label: 'Business Flows', value: flows, icon: IC.flow },
    { label: 'Known Locators', value: locators, icon: IC.target },
  ] as const;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
        marginBottom: 18,
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--b1)',
            borderRadius: 11,
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Icon d={item.icon} size={14} stroke="var(--ai)" />
            <span style={{ fontSize: 11, color: 'var(--t2)' }}>{item.label}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mono)' }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function PagesTab({ pages }: { pages: readonly PageDto[] }): React.ReactElement {
  if (pages.length === 0) {
    return <TabEmpty message="No pages indexed yet. Run repository analysis from the create wizard." />;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
      {pages.map((page) => (
        <div
          key={page.id}
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--b1)',
            borderRadius: 10,
            padding: '12px 13px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--acc)' }}>
              {page.url ?? `/${page.name.toLowerCase().replace(/\s+/g, '-')}`}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ok)', fontFamily: 'var(--mono)' }}>
              {page.understandingScore}%
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5 }}>{page.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--t2)', lineHeight: 1.45 }}>
            {page.description ?? `${page.locatorCount} locators mapped`}
          </div>
        </div>
      ))}
    </div>
  );
}

function FlowsTab({ flows }: { flows: readonly BusinessFlowDto[] }): React.ReactElement {
  if (flows.length === 0) {
    return <TabEmpty message="No business flows detected yet." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {flows.map((flow) => (
        <div
          key={flow.id}
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--b1)',
            borderRadius: 10,
            padding: '13px 15px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'var(--ai-dim)',
              border: '1px solid rgba(164,114,240,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon d={IC.flow} size={16} stroke="var(--ai)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{flow.name}</div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>{flow.stepCount} steps detected</div>
          </div>
          <Pill color="var(--ok)" background="var(--ok-dim)" border="rgba(67,181,129,0.3)">
            {Math.round(flow.confidence * 100)}%
          </Pill>
        </div>
      ))}
    </div>
  );
}

function LocatorsTab({ locators }: { locators: readonly LocatorDto[] }): React.ReactElement {
  if (locators.length === 0) {
    return <TabEmpty message="No locators extracted yet." />;
  }

  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--b1)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {locators.map((loc, index) => (
        <div
          key={loc.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 15px',
            borderBottom: index < locators.length - 1 ? '1px solid var(--b0)' : 'none',
          }}
        >
          <span style={{ width: 120, fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)' }}>
            {loc.name}
          </span>
          <span style={{ flex: 1, fontSize: 11.5, color: 'var(--t1)', fontFamily: 'var(--mono)' }}>
            {loc.strategy}({loc.selector})
          </span>
          <Pill>{loc.pageName}</Pill>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: loc.confidence >= 0.9 ? 'var(--ok)' : 'var(--t1)',
              fontFamily: 'var(--mono)',
              width: 36,
              textAlign: 'right',
            }}
          >
            {Math.round(loc.confidence * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function IntelTab({
  score,
  frameworkName,
  frameworkVersion,
  conventions,
  indexedAt,
}: {
  score: number;
  frameworkName: string;
  frameworkVersion: string;
  conventions: RepositoryIndexDto['conventions'];
  indexedAt: number;
}): React.ReactElement {
  const indexedLabel =
    indexedAt > 0 ? new Date(indexedAt).toLocaleString() : 'Not indexed yet';

  return (
    <div style={{ maxWidth: 560 }}>
      <div
        style={{
          background: 'var(--acc-bg)',
          border: '1px solid rgba(91,140,239,0.25)',
          borderRadius: 11,
          padding: '16px 18px',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <AdapterBadge framework={frameworkName} version={frameworkVersion} />
          <Pill color="var(--ok)" background="var(--ok-dim)" border="rgba(67,181,129,0.3)">
            {score}% understood
          </Pill>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--t1)', lineHeight: 1.45, margin: 0 }}>
          Verity maintains a living model of this repository — pages, components, flows and locators
          with confidence scores. Indexed {indexedLabel}.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {[
          ['Page object suffix', conventions.pageObjectSuffix],
          ['Test source root', conventions.testSourceRoot],
          ['Package root', conventions.packageRoot],
        ].map(([label, value]) =>
          value ? (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--b0)',
                fontSize: 12.5,
              }}
            >
              <span style={{ color: 'var(--t2)' }}>{label}</span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{value}</span>
            </div>
          ) : null,
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {['Knowledge graph', 'Self-healing locators', 'Autonomous maintenance', 'Coverage analysis'].map(
          (item) => (
            <Pill key={item} color="var(--t2)">
              {item} · soon
            </Pill>
          ),
        )}
      </div>
    </div>
  );
}

function TabEmpty({ message }: { message: string }): React.ReactElement {
  return (
    <div
      style={{
        padding: 24,
        textAlign: 'center',
        color: 'var(--t2)',
        fontSize: 13,
        background: 'var(--bg2)',
        border: '1px dashed var(--b1)',
        borderRadius: 10,
      }}
    >
      {message}
    </div>
  );
}

function EmptyState({
  message,
  onAction,
}: {
  message: string;
  onAction: () => void;
}): React.ReactElement {
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <p style={{ color: 'var(--t2)', fontSize: 13.5, marginBottom: 16 }}>{message}</p>
      <button
        type="button"
        onClick={onAction}
        style={{
          height: 36,
          padding: '0 14px',
          background: 'var(--acc)',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        Go to Projects
      </button>
    </div>
  );
}
