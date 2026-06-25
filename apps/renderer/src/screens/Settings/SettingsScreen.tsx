import { useCallback, useEffect, useState } from 'react';
import type { Project, ProjectSettings } from '@verity/core';
import { DEFAULT_PROJECT_SETTINGS } from '@verity/core';
import type { AdapterInfoDto, PrerequisiteReportDto } from '@verity/core/ipc';
import { AdapterBadge } from '../../components/AdapterBadge.js';
import { ChromeScreenHeader } from '../../components/ChromeScreenHeader.js';
import { IC, Icon } from '../../components/Icon.js';
import { Pill } from '../../components/Pill.js';
import { PrerequisiteCheckList } from '../../components/PrerequisiteCheckList.js';
import { invoke } from '../../ipc/client.js';
import { useToast } from '../../store/toast-store.js';
import { formatFramework, formatRepoSlug } from '../../utils/display.js';

/**
 * Settings → Framework Adapter screen (M3 E3-S3 T3).
 */
export function SettingsScreen({ project }: { project: Project | null }): React.ReactElement {
  const [adapters, setAdapters] = useState<readonly AdapterInfoDto[]>([]);
  const [prereqs, setPrereqs] = useState<PrerequisiteReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [toolchainBusy, setToolchainBusy] = useState(false);
  const [gitSettings, setGitSettings] = useState<ProjectSettings['git']>(DEFAULT_PROJECT_SETTINGS.git);
  const [gitSaving, setGitSaving] = useState(false);
  const toast = useToast((s) => s.show);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const list = await invoke('adapter:list', undefined);
      setAdapters(list);
      if (project) {
        const report = await invoke('adapter:check-prerequisites', { projectId: project.id });
        setPrereqs(report);
        const settings = await invoke('settings:get', { projectId: project.id });
        setGitSettings(settings.git);
      } else {
        setPrereqs(null);
        setGitSettings(DEFAULT_PROJECT_SETTINGS.git);
      }
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    void load();
  }, [load]);

  const installToolchain = useCallback(async (): Promise<void> => {
    if (!project) return;
    setToolchainBusy(true);
    try {
      const result = await invoke('toolchain:install-for-adapter', {
        adapterId: project.framework.adapterId,
      });
      toast(
        result.setup.ready
          ? 'Toolchain installed — re-check prerequisites'
          : 'Review toolchain install steps in setup log',
        result.setup.ready ? 'info' : 'err',
      );
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toolchain install failed', 'err');
    } finally {
      setToolchainBusy(false);
    }
  }, [project, toast, load]);

  const saveGitSettings = useCallback(async (): Promise<void> => {
    if (!project) return;
    setGitSaving(true);
    try {
      const current = await invoke('settings:get', { projectId: project.id });
      await invoke('settings:update', {
        projectId: project.id,
        settings: { ...current, git: gitSettings },
      });
      toast('Git settings saved');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save git settings', 'err');
    } finally {
      setGitSaving(false);
    }
  }, [project, gitSettings, toast]);

  const fw = project ? formatFramework(project.framework) : null;
  const active = project
    ? adapters.find((a) => a.id === project.framework.adapterId)
    : adapters[0];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ChromeScreenHeader>
        <Icon d={IC.settings} size={16} stroke="var(--t1)" />
        <span style={{ fontSize: 14, fontWeight: 700 }}>Settings</span>
        {project && (
          <span style={{ fontSize: 12, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
            {formatRepoSlug(project)}
          </span>
        )}
      </ChromeScreenHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <section style={{ maxWidth: 560, marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Framework Adapter</h2>
          <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: '20px', marginBottom: 16 }}>
            The adapter is Verity&apos;s execution engine. Semantic tests stay framework-neutral —
            switching adapters re-transpiles without rewriting intents.
          </p>

          {project && fw && (
            <div
              style={{
                padding: '14px 16px',
                background: 'var(--bg2)',
                border: '1px solid var(--acc)',
                borderRadius: 11,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <AdapterBadge framework={fw.name} version={fw.version} />
                <Pill color="var(--acc)" background="var(--acc-dim)" border="rgba(91,140,239,0.25)">
                  active
                </Pill>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--t2)', marginTop: 10, lineHeight: '16px' }}>
                {project.framework.buildTool} · {project.framework.testFramework} ·{' '}
                {project.framework.pattern}
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 8 }}>
            Registered adapters
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {adapters.map((adapter) => (
              <div
                key={adapter.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'var(--bg2)',
                  border: `1px solid ${adapter.id === active?.id ? 'var(--acc)' : 'var(--b1)'}`,
                  borderRadius: 8,
                }}
              >
                <Icon d={IC.layers} size={14} stroke="var(--t2)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{adapter.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
                    {adapter.id} · v{adapter.version}
                  </div>
                </div>
                {adapter.id === active?.id && (
                  <Pill color="var(--acc)" background="var(--acc-dim)">
                    active
                  </Pill>
                )}
              </div>
            ))}
          </div>
        </section>

        {project && (
          <section style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Prerequisites</h2>
              {prereqs && (
                <Pill
                  color={prereqs.ready ? 'var(--ok)' : 'var(--mod)'}
                  background={prereqs.ready ? 'var(--ok-dim)' : 'var(--mod-dim)'}
                >
                  {prereqs.ready ? 'ready' : 'action needed'}
                </Pill>
              )}
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                style={{
                  height: 28,
                  padding: '0 10px',
                  border: '1px solid var(--b1)',
                  borderRadius: 7,
                  background: 'var(--bg2)',
                  color: 'var(--t1)',
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                Re-check
              </button>
            </div>
            {loading && !prereqs ? (
              <div style={{ fontSize: 12.5, color: 'var(--t2)' }}>Checking environment…</div>
            ) : prereqs ? (
              <PrerequisiteCheckList
                checks={prereqs.checks}
                onInstallToolchain={() => void installToolchain()}
                installBusy={toolchainBusy}
              />
            ) : null}
          </section>
        )}

        {project && (
          <section style={{ maxWidth: 560, marginTop: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Git Integration</h2>
            <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: '20px', marginBottom: 16 }}>
              Commits go to your repository only after you review them. Verity never force-pushes or
              auto-commits.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t2)' }}>Commit author</span>
                <input
                  value={gitSettings.commitAuthor}
                  onChange={(event) =>
                    setGitSettings((s) => ({ ...s, commitAuthor: event.target.value }))
                  }
                  style={{
                    height: 34,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: '1px solid var(--b1)',
                    background: 'var(--bg2)',
                    color: 'var(--t0)',
                    fontSize: 12.5,
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t2)' }}>Branch prefix</span>
                <input
                  value={gitSettings.branchPrefix}
                  onChange={(event) =>
                    setGitSettings((s) => ({ ...s, branchPrefix: event.target.value }))
                  }
                  style={{
                    height: 34,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: '1px solid var(--b1)',
                    background: 'var(--bg2)',
                    color: 'var(--t0)',
                    fontSize: 12.5,
                    fontFamily: 'var(--mono)',
                  }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                <input
                  type="checkbox"
                  checked={gitSettings.openPullRequests}
                  onChange={(event) =>
                    setGitSettings((s) => ({ ...s, openPullRequests: event.target.checked }))
                  }
                />
                Open pull requests after push (post-MVP automation)
              </label>
              <Pill color="var(--t2)" background="var(--bg3)" border="var(--b1)">
                Review before commit — always on (MVP)
              </Pill>
              <button
                type="button"
                onClick={() => void saveGitSettings()}
                disabled={gitSaving}
                style={{
                  alignSelf: 'flex-start',
                  height: 32,
                  padding: '0 14px',
                  border: 'none',
                  borderRadius: 8,
                  background: 'var(--acc)',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: gitSaving ? 'default' : 'pointer',
                }}
              >
                {gitSaving ? 'Saving…' : 'Save git settings'}
              </button>
            </div>
          </section>
        )}

        {!project && (
          <div style={{ fontSize: 13, color: 'var(--t2)' }}>
            Open a project to check adapter prerequisites for your repository.
          </div>
        )}
      </div>
    </div>
  );
}
