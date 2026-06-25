import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@verity/core';
import { GitMark } from '../../components/GitMark.js';
import { ChromeHomeButton } from '../../components/ChromeHomeButton.js';
import { BranchSelector } from '../../components/BranchSelector.js';
import { ErrorStateBanner } from '../../components/ErrorStateBanner.js';
import { OfflineBanner } from '../../components/OfflineBanner.js';
import { Icon, IC } from '../../components/Icon.js';
import { useAiStudioStore } from '../../store/ai-studio-store.js';
import { bindExecutionEvents, useExecutionStore } from '../../store/execution-store.js';
import { bindGitEvents, useGitStore } from '../../store/git-store.js';
import { useWorkspacePrereqStore } from '../../store/workspace-prereq-store.js';
import { invoke } from '../../ipc/client.js';
import { useRouter } from '../../store/router-store.js';
import { useSemanticStore } from '../../store/semantic-store.js';
import { useToast } from '../../store/toast-store.js';
import { useWorkspaceExplorer } from '../../store/workspace-explorer-store.js';
import { formatFramework, formatRepoSlug, formatWorkspaceStatus } from '../../utils/display.js';
import { AiStudioPanel } from './AiStudioPanel.js';
import { CommitModal } from './CommitModal.js';
import { FilePreviewPanel } from './FilePreviewPanel.js';
import { PrerequisiteGateModal } from './PrerequisiteGateModal.js';
import { WorkspaceLeftPanel } from './WorkspaceLeftPanel.js';

type CenterTab = 'browser' | 'editor' | 'timeline';
type BottomTab = 'reasoning' | 'execution' | 'git';

/**
 * Workspace layout — explorer, editor/browser, AI Studio, execution timeline.
 */
export function WorkspaceScreen({ project }: { project: Project | null }) {
  const go = useRouter((s) => s.go);
  const selectedSlug = useSemanticStore((s) => s.selectedSlug);
  const selectedTest = useSemanticStore((s) => s.selectedTest);
  const loadingDetail = useSemanticStore((s) => s.loadingDetail);
  const selectTest = useSemanticStore((s) => s.selectTest);
  const clearSelection = useSemanticStore((s) => s.clearSelection);
  const loadTests = useSemanticStore((s) => s.loadTests);

  const selectedPath = useWorkspaceExplorer((s) => s.selectedPath);
  const filePreview = useWorkspaceExplorer((s) => s.filePreview);
  const fileLoading = useWorkspaceExplorer((s) => s.fileLoading);
  const fileError = useWorkspaceExplorer((s) => s.fileError);
  const resetExplorer = useWorkspaceExplorer((s) => s.reset);

  const running = useExecutionStore((s) => s.running);
  const activeRun = useExecutionStore((s) => s.activeRun);
  const execLogs = useExecutionStore((s) => s.logs);
  const runTest = useExecutionStore((s) => s.runTest);
  const cancelRun = useExecutionStore((s) => s.cancelRun);
  const resetExecution = useExecutionStore((s) => s.reset);

  const reasoning = useAiStudioStore((s) => s.reasoning);
  const resetAi = useAiStudioStore((s) => s.reset);

  const toast = useToast((s) => s.show);
  const [branchPrefix, setBranchPrefix] = useState('verity/');
  const gitStatus = useGitStore((s) => s.status);
  const gitChanges = gitStatus?.changes ?? [];
  const gitActivity = useGitStore((s) => s.activity);
  const commitModalOpen = useGitStore((s) => s.commitModalOpen);
  const loadGitStatus = useGitStore((s) => s.loadStatus);
  const openCommitModal = useGitStore((s) => s.openCommitModal);
  const closeCommitModal = useGitStore((s) => s.closeCommitModal);
  const resetGit = useGitStore((s) => s.reset);

  const prereqReport = useWorkspacePrereqStore((s) => s.report);
  const prereqLoading = useWorkspacePrereqStore((s) => s.loading);
  const prereqInstallBusy = useWorkspacePrereqStore((s) => s.installBusy);
  const loadPrereqs = useWorkspacePrereqStore((s) => s.load);
  const installToolchain = useWorkspacePrereqStore((s) => s.installToolchain);
  const resetPrereqs = useWorkspacePrereqStore((s) => s.reset);

  const [centerTab, setCenterTab] = useState<CenterTab>('browser');
  const [bottomTab, setBottomTab] = useState<BottomTab>('reasoning');
  const [prereqModalOpen, setPrereqModalOpen] = useState(false);

  useEffect(() => {
    clearSelection();
    resetExplorer();
    resetExecution();
    resetAi();
    resetGit();
    resetPrereqs();
  }, [project?.id, clearSelection, resetExplorer, resetExecution, resetAi, resetGit, resetPrereqs]);

  useEffect(() => {
    if (!project) return;
    void loadGitStatus(project.id);
    void loadPrereqs(project.id);
    void invoke('settings:get', { projectId: project.id }).then((settings) => {
      setBranchPrefix(settings.git.branchPrefix);
    });
    const offExec = bindExecutionEvents(project.id);
    const offGit = bindGitEvents(project.id, toast);
    return () => {
      offExec();
      offGit();
    };
  }, [project?.id, loadGitStatus, loadPrereqs, toast]);

  const runTarget = project ? (selectedSlug ?? selectedTest?.id ?? null) : null;

  const handleRun = useCallback((): void => {
    if (!project || !runTarget || running) return;
    if (prereqReport && !prereqReport.ready) {
      setPrereqModalOpen(true);
      return;
    }
    setBottomTab('execution');
    void runTest(project.id, runTarget).then(() => loadTests(project.id));
  }, [project, runTarget, running, prereqReport, runTest, loadTests]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRun]);

  useEffect(() => {
    if (selectedPath) setCenterTab('editor');
  }, [selectedPath]);

  useEffect(() => {
    if (running || activeRun) setCenterTab('timeline');
  }, [running, activeRun]);

  if (!project) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: 24,
        }}
      >
        <span style={{ color: 'var(--t2)', fontSize: 13 }}>No project open.</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <ChromeHomeButton />
          <button
            type="button"
            onClick={() => go('projects')}
            style={{
              height: 28,
              padding: '0 12px',
              border: '1px solid var(--b1)',
              borderRadius: 7,
              background: 'var(--bg2)',
              color: 'var(--t0)',
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            Browse projects
          </button>
        </div>
      </div>
    );
  }

  const fw = formatFramework(project.framework);

  const handleSelectTest = (slug: string): void => {
    if (selectedSlug === slug) {
      clearSelection();
      return;
    }
    void selectTest(project.id, slug);
  };

  const handleInstallToolchain = (): void => {
    void installToolchain(project.framework.adapterId).then((ready) => {
      toast(ready ? 'Toolchain installed — re-checking…' : 'Review install steps in Settings', ready ? 'info' : 'err');
      void loadPrereqs(project.id);
    });
  };

  const prereqsReady = prereqReport?.ready ?? true;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <OfflineBanner />
      {!prereqLoading && prereqReport && !prereqsReady ? (
        <ErrorStateBanner
          code="S-08"
          title="Test runner not ready"
          message="Install JDK/Maven or Playwright browsers before running tests."
          tone="err"
          action={
            <button
              type="button"
              onClick={() => setPrereqModalOpen(true)}
              style={{
                height: 28,
                padding: '0 10px',
                border: '1px solid var(--err)',
                borderRadius: 7,
                background: 'transparent',
                color: 'var(--err)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Fix environment
            </button>
          }
        />
      ) : null}
      <div
        style={{
          height: 40,
          borderBottom: '1px solid var(--b0)',
          background: 'var(--bg0)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <ChromeHomeButton label="" />
        <GitMark source={project.repository.source} size={14} />
        <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--mono)' }}>
          {formatRepoSlug(project)}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--t2)' }}>
          {fw.name} · {fw.version}
        </span>
        {gitStatus ? (
          <BranchSelector
            projectId={project.id}
            branch={gitStatus.branch}
            branchPrefix={branchPrefix}
          />
        ) : null}
        <div style={{ flex: 1 }} />
        {gitChanges.length > 0 ? (
          <button
            type="button"
            onClick={() => openCommitModal()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 26,
              padding: '0 11px',
              background: 'var(--bg2)',
              border: '1px solid var(--b2)',
              borderRadius: 7,
              color: 'var(--t0)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Icon d={IC.git} size={13} stroke="var(--mod, #E0A33A)" />
            {gitChanges.length} changes
          </button>
        ) : null}
        {runTarget ? (
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            title={!prereqsReady ? 'Environment not ready (S-08) — click for details' : 'Run test (⌘R)'}
            style={{
              height: 28,
              padding: '0 12px',
              border: 'none',
              borderRadius: 7,
              background: running ? 'var(--bg3)' : 'var(--acc)',
              color: running ? 'var(--t2)' : 'white',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: running ? 'default' : 'pointer',
            }}
          >
            {running ? 'Running…' : 'Run test'}
          </button>
        ) : null}
        {running && activeRun ? (
          <button
            type="button"
            onClick={() => void cancelRun(activeRun.id)}
            style={{
              height: 28,
              padding: '0 10px',
              border: '1px solid var(--b1)',
              borderRadius: 7,
              background: 'var(--bg2)',
              color: 'var(--t0)',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
        ) : null}
        <span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
          {formatWorkspaceStatus(project.status)}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <WorkspaceLeftPanel
          project={project}
          selectedSlug={selectedSlug}
          onSelectTest={handleSelectTest}
        />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderRight: '1px solid var(--b0)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg1)',
          }}
        >
          <div
            style={{
              height: 34,
              borderBottom: '1px solid var(--b0)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <CenterTabButton label="Browser" active={centerTab === 'browser'} onClick={() => setCenterTab('browser')} />
            <CenterTabButton
              label="Editor"
              active={centerTab === 'editor'}
              onClick={() => setCenterTab('editor')}
              {...(selectedPath ? { badge: '●' } : {})}
            />
            <CenterTabButton
              label="Timeline"
              active={centerTab === 'timeline'}
              onClick={() => setCenterTab('timeline')}
              {...(running ? { badge: '●' } : {})}
            />
          </div>

          {centerTab === 'browser' ? (
            <div style={{ flex: 1, overflow: 'auto', padding: 12, color: 'var(--t2)', fontSize: 12.5 }}>
              <div style={{ opacity: 0.7, lineHeight: '18px' }}>
                Interactive browser ships in a later epic. Generate tests in AI Studio, apply to the
                repo, then run with the toolbar button.
              </div>
            </div>
          ) : centerTab === 'editor' ? (
            <FilePreviewPanel
              path={selectedPath}
              preview={filePreview}
              loading={fileLoading}
              error={fileError}
            />
          ) : (
            <ExecutionTimeline run={activeRun} running={running} />
          )}
        </div>

        <AiStudioPanel project={project} selectedTest={selectedTest} loadingDetail={loadingDetail} />
      </div>

      <div
        style={{
          height: 140,
          flexShrink: 0,
          borderTop: '1px solid var(--b0)',
          background: 'var(--bg0)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            height: 30,
            borderBottom: '1px solid var(--b0)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            gap: 4,
          }}
        >
          <BottomTabButton
            label="AI Reasoning"
            active={bottomTab === 'reasoning'}
            onClick={() => setBottomTab('reasoning')}
          />
          <BottomTabButton
            label="Execution Logs"
            active={bottomTab === 'execution'}
            onClick={() => setBottomTab('execution')}
          />
          <BottomTabButton
            label="Git Activity"
            active={bottomTab === 'git'}
            onClick={() => setBottomTab('git')}
            {...(gitChanges.length > 0 ? { badge: String(gitChanges.length) } : {})}
          />
        </div>
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px 12px',
            fontFamily: 'var(--mono)',
            fontSize: 11.5,
          }}
        >
          {bottomTab === 'reasoning' ? (
            reasoning.length === 0 ? (
              <span style={{ color: 'var(--t3)' }}>Reasoning trace appears when you generate a test.</span>
            ) : (
              reasoning.map((entry, i) => (
                <div
                  key={`${entry.timestamp}-${i}`}
                  style={{
                    color:
                      entry.type === 'err'
                        ? 'var(--err)'
                        : entry.type === 'step'
                          ? 'var(--acc)'
                          : 'var(--t2)',
                    marginBottom: 4,
                    lineHeight: '16px',
                  }}
                >
                  [{entry.type}] {entry.message}
                </div>
              ))
            )
          ) : bottomTab === 'execution' ? (
            execLogs.length === 0 ? (
              <span style={{ color: 'var(--t3)' }}>Run a semantic test to see execution output.</span>
            ) : (
              execLogs.map((log, i) => (
                <div
                  key={`${log.timestamp}-${i}`}
                  style={{
                    color:
                      log.type === 'error'
                        ? 'var(--err)'
                        : log.type === 'success'
                          ? 'var(--ok)'
                          : 'var(--t2)',
                    marginBottom: 4,
                  }}
                >
                  {log.message}
                </div>
              ))
            )
          ) : gitActivity.length === 0 && gitChanges.length === 0 ? (
            <span style={{ color: 'var(--t3)' }}>Git activity appears when you apply changes or commit.</span>
          ) : (
            <>
              {gitChanges.length > 0 ? (
                <>
                  <div style={{ color: 'var(--t1)', marginBottom: 4 }}>$ git status</div>
                  {gitChanges.map((change) => (
                    <div
                      key={change.path}
                      style={{
                        color: change.type === 'A' ? 'var(--ok)' : 'var(--mod, #E0A33A)',
                        marginBottom: 2,
                      }}
                    >
                      {change.type === 'A' ? 'new file:' : change.type === 'D' ? 'deleted:' : 'modified:'}{' '}
                      {change.path}
                    </div>
                  ))}
                </>
              ) : null}
              {gitActivity.map((entry, i) => (
                <div
                  key={`${entry.timestamp}-${i}`}
                  style={{
                    color:
                      entry.type === 'error'
                        ? 'var(--err)'
                        : entry.type === 'success'
                          ? 'var(--ok)'
                          : 'var(--t2)',
                    marginTop: 6,
                  }}
                >
                  {entry.message}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {commitModalOpen && gitChanges.length > 0 ? (
        <CommitModal
          project={project}
          changes={gitChanges}
          branch={gitStatus?.branch ?? 'main'}
          onClose={closeCommitModal}
        />
      ) : null}

      {prereqModalOpen && prereqReport && !prereqReport.ready ? (
        <PrerequisiteGateModal
          report={prereqReport}
          installBusy={prereqInstallBusy}
          onClose={() => setPrereqModalOpen(false)}
          onInstallToolchain={handleInstallToolchain}
          onOpenSettings={() => {
            setPrereqModalOpen(false);
            go('settings');
          }}
        />
      ) : null}
    </div>
  );
}

function ExecutionTimeline({
  run,
  running,
}: {
  run: ReturnType<typeof useExecutionStore.getState>['activeRun'];
  running: boolean;
}): React.ReactElement {
  if (!run && !running) {
    return (
      <div style={{ padding: 16, color: 'var(--t2)', fontSize: 12.5 }}>
        Select a semantic test and click Run test to see the step timeline.
      </div>
    );
  }

  const steps = run?.steps ?? [];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
      {steps.map((step) => (
        <div
          key={step.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0',
            borderBottom: '1px solid var(--b0)',
          }}
        >
          <StepIcon status={step.status} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{step.label}</div>
            <div style={{ fontSize: 10.5, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
              {step.status}
              {step.durationMs != null ? ` · ${step.durationMs}ms` : ''}
            </div>
          </div>
        </div>
      ))}
      {running && steps.length === 0 ? (
        <div style={{ color: 'var(--t2)', fontSize: 12 }}>Starting run…</div>
      ) : null}
    </div>
  );
}

function StepIcon({ status }: { status: string }): React.ReactElement {
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
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

function CenterTabButton({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 28,
        padding: '0 10px',
        border: 'none',
        borderRadius: 6,
        background: active ? 'var(--bg3)' : 'transparent',
        color: active ? 'var(--t0)' : 'var(--t2)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {label}
      {badge ? <span style={{ fontSize: 8, color: 'var(--acc)' }}>{badge}</span> : null}
    </button>
  );
}

function BottomTabButton({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 26,
        padding: '0 10px',
        border: 'none',
        borderRadius: 5,
        background: active ? 'var(--bg2)' : 'transparent',
        color: active ? 'var(--t0)' : 'var(--t2)',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {label}
      {badge ? (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: 8,
            background: 'var(--mod, #E0A33A)',
            color: 'var(--bg0)',
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
