import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdapterId, Framework, Project, RepositorySource } from '@verity/core';
import type {
  AnalysisProgress,
  EnvironmentSetupResultDto,
  FrameworkCatalogEntryDto,
  FrameworkRecommendationDto,
} from '@verity/core/ipc';
import { AdapterBadge } from '../../components/AdapterBadge.js';
import { GitMark } from '../../components/GitMark.js';
import { IC, Icon } from '../../components/Icon.js';
import { Pill } from '../../components/Pill.js';
import type { FolderInspectionDto, MigrationPlanDto, PrerequisiteReportDto } from '@verity/core/ipc';
import { PrerequisiteCheckList } from '../../components/PrerequisiteCheckList.js';
import { EnvironmentSetupList, FrameworkCatalogPicker } from '../../components/FrameworkIntelligence.js';
import { invoke } from '../../ipc/client.js';
import { useProjects } from '../../store/project-store.js';
import { useRouter, type WizardMode } from '../../store/router-store.js';
import { useToast } from '../../store/toast-store.js';
import { formatFramework } from '../../utils/display.js';

const WIZARD_META: Record<
  WizardMode,
  { readonly title: string; readonly step1Title: string; readonly step1Subtitle: string }
> = {
  existing: {
    title: 'Connect a repository',
    step1Title: 'Where does the code live?',
    step1Subtitle:
      'Verity reads your repo locally. Tests are committed back through Git — never stored on our servers.',
  },
  greenfield: {
    title: 'Start fresh',
    step1Title: 'Choose stack & folder',
    step1Subtitle:
      'Pick an enterprise automation framework. Verity scaffolds the repo, resolves dependencies, and installs browsers.',
  },
  migrate: {
    title: 'Migrate from Selenium',
    step1Title: 'Where is your Selenium Java repo?',
    step1Subtitle:
      'Connect your existing suite. Verity maps tests and guides an incremental move to Playwright Java.',
  },
};
const WIZARD_STEPS_BY_MODE: Record<WizardMode, readonly string[]> = {
  existing: ['Project', 'Repository', 'Framework', 'Analysis', 'Ready'],
  greenfield: ['Project', 'Stack & folder', 'Setup', 'Analysis', 'Ready'],
  migrate: ['Project', 'Repository', 'Migration', 'Analysis', 'Ready'],
};

type WizardStep = 0 | 1 | 2 | 3 | 4;
type DetPhase = 0 | 1 | 2 | 'failed';
type AnaPhase = 0 | 1 | 2;

interface SourceOption {
  id: RepositorySource;
  name: string;
  sub: string;
  enabled: boolean;
}

const SOURCES: readonly SourceOption[] = [
  { id: 'local', name: 'Local Folder', sub: 'Open from disk', enabled: true },
  { id: 'github', name: 'GitHub', sub: 'OAuth — coming soon', enabled: false },
  { id: 'gitlab', name: 'GitLab', sub: 'Coming soon', enabled: false },
  { id: 'bitbucket', name: 'Bitbucket', sub: 'Coming soon', enabled: false },
];

/**
 * Create Project Wizard — 5 steps matching the locked prototype (M1).
 */
export function CreateProjectScreen(): React.ReactElement {
  const go = useRouter((s) => s.go);
  const wizardMode = useRouter((s) => s.wizardMode);
  const meta = WIZARD_META[wizardMode];
  const toast = useToast((s) => s.show);
  const createDraft = useProjects((s) => s.createDraft);
  const openProject = useProjects((s) => s.openProject);

  const [step, setStep] = useState<WizardStep>(0);
  const [name, setName] = useState('');
  const [source, setSource] = useState<RepositorySource>('local');
  const [localPath, setLocalPath] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [framework, setFramework] = useState<Framework | null>(null);
  const [detPhase, setDetPhase] = useState<DetPhase>(0);
  const [detError, setDetError] = useState<string | null>(null);
  const [anaPhase, setAnaPhase] = useState<AnaPhase>(0);
  const [counts, setCounts] = useState<AnalysisProgress>(emptyProgress());
  const [detectedFlows, setDetectedFlows] = useState<readonly string[]>([]);
  const [prereqs, setPrereqs] = useState<PrerequisiteReportDto | null>(null);
  const [prereqLoading, setPrereqLoading] = useState(false);
  const [appDescription, setAppDescription] = useState('');
  const [folderInspection, setFolderInspection] = useState<FolderInspectionDto | null>(null);
  const [migrationPlan, setMigrationPlan] = useState<MigrationPlanDto | null>(null);
  const [frameworkCatalog, setFrameworkCatalog] = useState<readonly FrameworkCatalogEntryDto[]>([]);
  const [frameworkRec, setFrameworkRec] = useState<FrameworkRecommendationDto | null>(null);
  const [selectedAdapterId, setSelectedAdapterId] = useState<AdapterId>('playwright-java');
  const [envSetup, setEnvSetup] = useState<EnvironmentSetupResultDto | null>(null);
  const [toolchainBusy, setToolchainBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadFrameworkIntelligence = useCallback(async (): Promise<void> => {
    try {
      const mode =
        wizardMode === 'migrate' ? 'migrate' : wizardMode === 'greenfield' ? 'greenfield' : 'existing';
      const desc = appDescription.trim();
      const path = localPath.trim();
      const [{ entries }, rec] = await Promise.all([
        invoke('intelligence:get-framework-catalog', undefined),
        invoke('intelligence:recommend-framework', {
          mode,
          ...(desc ? { appDescription: desc } : {}),
          ...(path ? { repoPath: path } : {}),
        }),
      ]);
      setFrameworkCatalog(entries);
      setFrameworkRec(rec);
      if (wizardMode === 'greenfield') {
        setSelectedAdapterId((current) => {
          const stillValid = entries.find((e) => e.adapterId === current)?.scaffoldSupported;
          return stillValid ? current : rec.recommended.adapterId;
        });
      }
    } catch {
      // Catalog is optional — wizard still works with defaults.
    }
  }, [wizardMode, appDescription, localPath]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadFrameworkIntelligence();
    }, appDescription.trim() || localPath.trim() ? 400 : 0);
    return () => clearTimeout(timer);
  }, [wizardMode, appDescription, localPath, loadFrameworkIntelligence]);

  const inspectLocalPath = useCallback(async (path: string): Promise<void> => {
    if (!path.trim()) {
      setFolderInspection(null);
      return;
    }
    try {
      const inspection = await invoke('repository:inspect-folder', { path });
      setFolderInspection(inspection);
    } catch {
      setFolderInspection(null);
    }
  }, []);

  const pickFolder = useCallback(async (): Promise<void> => {
    const result = await invoke('repository:pick-folder', undefined);
    if ('path' in result) {
      setLocalPath(result.path);
      await inspectLocalPath(result.path);
    }
  }, [inspectLocalPath]);

  const createNewFolder = useCallback(async (): Promise<void> => {
    const folderName = name.trim();
    if (!folderName) {
      toast('Name your workspace first — we use it as the new folder name', 'err');
      return;
    }
    const parent = await invoke('repository:pick-parent-folder', undefined);
    if (!('path' in parent)) return;
    try {
      const created = await invoke('repository:create-folder', {
        parentPath: parent.path,
        folderName,
      });
      setLocalPath(created.path);
      await inspectLocalPath(created.path);
      toast(`Created ${folderName} at ${parent.path}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create folder', 'err');
    }
  }, [name, toast, inspectLocalPath]);

  const connectLocal = useCallback(async (): Promise<boolean> => {
    if (!project) return false;
    if (!localPath.trim()) {
      toast('Choose a folder for the repository', 'err');
      return false;
    }
    try {
      const { project: updated } = await invoke('repository:connect-local', {
        projectId: project.id,
        localPath,
      });
      setProject(updated);
      return true;
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not connect folder', 'err');
      return false;
    }
  }, [project, localPath, toast]);

  const loadPrerequisites = useCallback(async (projectId: Project['id']): Promise<void> => {
    setPrereqLoading(true);
    try {
      const report = await invoke('adapter:check-prerequisites', { projectId });
      setPrereqs(report);
    } catch (error) {
      setPrereqs(null);
      toast(
        error instanceof Error ? error.message : 'Could not check framework prerequisites',
        'err',
      );
    } finally {
      setPrereqLoading(false);
    }
  }, [toast]);

  const installToolchain = useCallback(async (): Promise<void> => {
    const adapterId = framework?.adapterId ?? selectedAdapterId;
    setToolchainBusy(true);
    try {
      const result = await invoke('toolchain:install-for-adapter', { adapterId });
      setEnvSetup(result.setup);
      toast(
        result.setup.ready
          ? 'Toolchain installed — prerequisites should pass after restart'
          : 'Toolchain install completed with items to review',
        result.setup.ready ? 'info' : 'err',
      );
      if (project) {
        void loadPrerequisites(project.id);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toolchain install failed', 'err');
    } finally {
      setToolchainBusy(false);
    }
  }, [framework, selectedAdapterId, project, toast, loadPrerequisites]);

  const loadMigrationPlan = useCallback(async (projectId: Project['id']): Promise<void> => {
    setDetPhase(1);
    setDetError(null);
    try {
      const plan = await invoke('intelligence:get-migration-plan', { projectId });
      setMigrationPlan(plan);
      setFramework({
        adapterId: 'selenium-java',
        version: 'detected',
        buildTool: 'maven',
        testFramework: 'JUnit',
        pattern: 'page-object-model',
      });
      setDetPhase(2);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Migration planning failed';
      setDetError(message);
      setDetPhase('failed');
      toast(message, 'err');
    }
  }, [toast]);

  const runDetection = useCallback(async (): Promise<void> => {
    if (!project) return;
    setDetPhase(1);
    setDetError(null);
    setFramework(null);
    try {
      const [fw] = await Promise.all([
        invoke('intelligence:detect-framework', { projectId: project.id }),
        new Promise<void>((resolve) => setTimeout(resolve, 700)),
      ]);
      setFramework(fw);
      setProject((p) => (p ? { ...p, framework: fw } : p));
      setDetPhase(2);
      void loadPrerequisites(project.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Framework detection failed';
      setDetError(message);
      setDetPhase('failed');
      toast(message, 'err');
    }
  }, [project, toast, loadPrerequisites]);

  const runAnalysis = useCallback(async (): Promise<void> => {
    if (!project) return;
    setAnaPhase(1);
    setCounts(emptyProgress());
    setDetectedFlows([]);
    try {
      const { jobId } = await invoke('intelligence:start-analysis', { projectId: project.id });
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        void (async () => {
          const job = await invoke('intelligence:get-analysis-status', {
            projectId: project.id,
            jobId,
          });
          setCounts(job.progress);
          if (job.status === 'completed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setAnaPhase(2);
            const refreshed = await invoke('project:get', { projectId: project.id });
            setProject(refreshed);
            const flows = await invoke('intelligence:get-flows', { projectId: project.id });
            setDetectedFlows(flows.map((f) => f.name));
          }
          if (job.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            toast(job.error ?? 'Analysis failed', 'err');
            setAnaPhase(0);
          }
        })();
      }, 400);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Analysis failed', 'err');
      setAnaPhase(0);
    }
  }, [project, toast]);

  const finish = useCallback(async (): Promise<void> => {
    if (!project) return;
    setBusy(true);
    try {
      const finalized = await invoke('project:finalize', { projectId: project.id });
      await openProject(finalized.id);
      toast('Repository connected — workspace ready');
      go('workspace');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not open workspace', 'err');
    } finally {
      setBusy(false);
    }
  }, [project, openProject, toast, go]);

  const handleNext = async (): Promise<void> => {
    if (step === 0) {
      if (name.trim().length < 1) return;
      setBusy(true);
      try {
        const draft = await createDraft(name.trim());
        setProject(draft);
        setStep(1);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Could not create workspace', 'err');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (step === 1) {
      if (source !== 'local') {
        toast('Remote OAuth connection ships soon — use Local Folder for now', 'info');
        return;
      }
      if (!project) return;

      if (wizardMode === 'greenfield') {
        setBusy(true);
        try {
          const scaffoldReq: {
            projectId: Project['id'];
            localPath: string;
            adapterId: AdapterId;
            appDescription?: string;
          } = { projectId: project.id, localPath, adapterId: selectedAdapterId };
          const desc = appDescription.trim();
          if (desc) scaffoldReq.appDescription = desc;
          const result = await invoke('project:scaffold-greenfield', scaffoldReq);
          setProject(result.project);
          setFramework(result.project.framework);
          setEnvSetup(result.setup);
          setDetPhase(2);
          setStep(2);
          const stackName =
            frameworkCatalog.find((e) => e.adapterId === selectedAdapterId)?.displayName ??
            'Playwright Java';
          toast(
            result.setup.ready
              ? `${stackName} ready — ${result.filesCreated} files, dependencies installed`
              : `Scaffolded ${result.filesCreated} files — review setup steps`,
          );
          void loadPrerequisites(result.project.id);
        } catch (error) {
          toast(error instanceof Error ? error.message : 'Could not scaffold project', 'err');
        } finally {
          setBusy(false);
        }
        return;
      }

      setBusy(true);
      const ok = await connectLocal();
      setBusy(false);
      if (!ok) return;
      setStep(2);
      if (wizardMode === 'migrate') {
        void loadMigrationPlan(project.id);
      } else {
        void runDetection();
      }
      return;
    }

    if (step === 2) {
      setStep(3);
      void runAnalysis();
      return;
    }

    if (step === 3) {
      setStep(4);
      return;
    }

    if (step === 4) {
      await finish();
    }
  };

  const canNext =
    !busy &&
    (step === 0
      ? name.trim().length > 0
      : step === 1
        ? source === 'local' &&
          localPath.trim().length > 0 &&
          (wizardMode === 'migrate'
            ? folderInspection === null || folderInspection.entryKind === 'selenium-java'
            : wizardMode === 'greenfield'
              ? folderInspection === null || folderInspection.isEmpty
              : true) &&
          (wizardMode !== 'greenfield' ||
            frameworkCatalog.find((e) => e.adapterId === selectedAdapterId)?.scaffoldSupported !==
              false)
        : step === 2
          ? wizardMode === 'migrate'
            ? detPhase === 2 && migrationPlan !== null
            : detPhase === 2
          : step === 3
            ? anaPhase === 2
            : true);

  const nextLabel =
    step === 1
      ? wizardMode === 'greenfield'
        ? 'Scaffold project'
        : wizardMode === 'migrate'
          ? 'Connect & plan migration'
          : 'Detect framework'
      : step === 2
        ? 'Analyze repository'
        : step === 3
          ? 'Continue'
          : step === 4
            ? 'Open workspace'
            : 'Continue';

  const fwDisplay = framework ? formatFramework(framework) : null;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'radial-gradient(100% 80% at 70% 0%,#101725,#0A0C10 60%)',
      }}
    >
      <header
        style={{
          height: 50,
          borderBottom: '1px solid var(--b0)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: 'linear-gradient(135deg,var(--acc),var(--ai))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon d={IC.shield} size={14} stroke="white" strokeWidth={2} />
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>{meta.title}</span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => go('welcome')}
          style={{
            width: 28,
            height: 28,
            border: 'none',
            background: 'var(--bg3)',
            color: 'var(--t2)',
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon d={IC.x} size={15} />
        </button>
      </header>

      <WizardProgressBar step={step} wizardMode={wizardMode} />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: '34px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 520 }} key={step}>
          {step === 0 && (
            <StepPanel title="Name your workspace" subtitle="One workspace maps to one repository and its test suite.">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>
                Workspace name
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="shop-e2e-tests"
                style={inputStyle}
              />
            </StepPanel>
          )}

          {step === 1 && (
            <StepPanel title={meta.step1Title} subtitle={meta.step1Subtitle}>
              {frameworkRec && wizardMode !== 'greenfield' && step === 1 ? (
                <div
                  style={{
                    marginBottom: 16,
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--ai-dim)',
                    border: '1px solid rgba(167,139,250,0.25)',
                    fontSize: 12.5,
                    lineHeight: '18px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--ai)', marginBottom: 6 }}>
                    Intelligence: {frameworkRec.recommended.displayName}
                    {frameworkRec.source === 'llm' ? ' (AI)' : ''}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--t1)' }}>
                    {frameworkRec.reasons.slice(0, 3).map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {wizardMode === 'greenfield' ? (
                <>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--t1)',
                      marginBottom: 8,
                    }}
                  >
                    What are you testing? (helps intelligence recommend a stack)
                  </label>
                  <textarea
                    value={appDescription}
                    onChange={(e) => setAppDescription(e.target.value)}
                    placeholder="e.g. Java Spring B2B checkout at https://shop.example.com"
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 56, marginBottom: 16 }}
                  />
                  {frameworkCatalog.length > 0 ? (
                    <FrameworkCatalogPicker
                      catalog={frameworkCatalog}
                      recommendation={frameworkRec}
                      selectedAdapterId={selectedAdapterId}
                      onSelect={setSelectedAdapterId}
                    />
                  ) : null}
                </>
              ) : null}
              {wizardMode !== 'greenfield' ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginBottom: 18,
                  }}
                >
                  {SOURCES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!s.enabled}
                      onClick={() => s.enabled && setSource(s.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 11,
                        padding: '13px 14px',
                        background: source === s.id ? 'var(--acc-bg)' : 'var(--bg2)',
                        border: `1.5px solid ${source === s.id ? 'var(--acc)' : 'var(--b1)'}`,
                        borderRadius: 10,
                        textAlign: 'left',
                        opacity: s.enabled ? 1 : 0.55,
                        cursor: s.enabled ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: 'var(--bg3)',
                          border: '1px solid var(--b1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {s.id === 'local' ? (
                          <Icon d={IC.folder} size={16} stroke="var(--t1)" />
                        ) : (
                          <GitMark source={s.id} size={16} />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t2)' }}>{s.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>
                {wizardMode === 'greenfield' ? 'Project location' : 'Repository folder'}
              </label>
              {wizardMode === 'greenfield' ? (
                <p style={{ fontSize: 11.5, color: 'var(--t2)', marginBottom: 10, lineHeight: '16px' }}>
                  Browse an empty folder, or create a new one — we&apos;ll scaffold inside it using your workspace
                  name{ name.trim() ? ` (“${name.trim()}”)` : ''}.
                </p>
              ) : null}
              <div style={{ display: 'flex', gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    height: 44,
                    background: 'var(--bg2)',
                    border: '1.5px solid var(--b1)',
                    borderRadius: 9,
                    padding: '0 14px',
                  }}
                >
                  <GitMark source={source} size={15} />
                  <input
                    value={localPath}
                    onChange={(e) => {
                      setLocalPath(e.target.value);
                      void inspectLocalPath(e.target.value);
                    }}
                    placeholder={
                      wizardMode === 'greenfield'
                        ? '/path/to/new-project-folder'
                        : '/path/to/your/test-repo'
                    }
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--t0)',
                      fontSize: 13,
                      fontFamily: 'var(--mono)',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void pickFolder()}
                  style={{
                    height: 44,
                    padding: '0 14px',
                    border: '1px solid var(--b1)',
                    borderRadius: 9,
                    background: 'var(--bg2)',
                    color: 'var(--t0)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  Browse…
                </button>
                {wizardMode === 'greenfield' ? (
                  <button
                    type="button"
                    onClick={() => void createNewFolder()}
                    style={{
                      height: 44,
                      padding: '0 14px',
                      border: '1px solid var(--acc)',
                      borderRadius: 9,
                      background: 'var(--acc-bg)',
                      color: 'var(--acc)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    New folder…
                  </button>
                ) : null}
              </div>
              {folderInspection ? (
                <FolderInspectionBanner inspection={folderInspection} wizardMode={wizardMode} />
              ) : null}
            </StepPanel>
          )}

          {step === 2 && (
            <div style={{ textAlign: 'center', paddingTop: 10, animation: 'slideU 0.3s ease' }}>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                {wizardMode === 'migrate' && detPhase === 2
                  ? 'Migration plan ready'
                  : wizardMode === 'greenfield' && detPhase === 2
                    ? 'Environment ready'
                    : detPhase === 2
                      ? 'Framework detected'
                      : detPhase === 'failed'
                        ? wizardMode === 'migrate'
                          ? 'Migration planning failed'
                          : 'Detection failed'
                        : wizardMode === 'migrate'
                          ? 'Planning migration'
                          : wizardMode === 'greenfield'
                            ? 'Scaffolding project'
                            : 'Detecting framework'}
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--t1)', marginBottom: 30 }}>
                {wizardMode === 'migrate' && detPhase === 2
                  ? 'Incremental path from Selenium Java to Playwright Java — semantic tests first.'
                  : wizardMode === 'greenfield' && detPhase === 2
                    ? 'Repo scaffolded with latest dependencies. Verity indexed your starter page objects.'
                    : detPhase === 2
                      ? 'Verity will use this as the active execution adapter.'
                      : detPhase === 'failed'
                        ? wizardMode === 'greenfield'
                          ? 'Use an empty folder or pick a different path.'
                          : 'Point the wizard at a supported repository, or pick another folder.'
                        : wizardMode === 'migrate'
                          ? 'Reading Selenium tests and page objects…'
                          : wizardMode === 'greenfield'
                            ? 'Creating Maven layout, page objects, and semantic tests…'
                            : 'Reading build files, dependencies and test structure…'}
              </p>
              <DetectionIcon done={detPhase === 2} failed={detPhase === 'failed'} />
              {detPhase === 'failed' && detError && (
                <div
                  style={{
                    maxWidth: 380,
                    margin: '0 auto 16px',
                    padding: '12px 14px',
                    background: 'rgba(239,91,91,0.08)',
                    border: '1px solid rgba(239,91,91,0.35)',
                    borderRadius: 9,
                    fontSize: 12.5,
                    color: 'var(--t1)',
                    textAlign: 'left',
                    lineHeight: 1.5,
                  }}
                >
                  {detError}
                </div>
              )}
              {framework && detPhase === 2 && wizardMode !== 'migrate' && (
                <FrameworkRows framework={framework} fwDisplay={fwDisplay} />
              )}
              {migrationPlan && detPhase === 2 && wizardMode === 'migrate' && (
                <MigrationPlanPanel plan={migrationPlan} />
              )}
              {framework && detPhase === 2 && wizardMode === 'migrate' && (
                <div style={{ maxWidth: 420, margin: '16px auto 0', textAlign: 'left' }}>
                  <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 8 }}>Current stack</div>
                  <AdapterBadge framework="Selenium Java" version="detected" />
                </div>
              )}
              {envSetup && wizardMode === 'greenfield' && detPhase === 2 ? (
                <EnvironmentSetupList setup={envSetup} />
              ) : null}
              {detPhase === 2 && wizardMode !== 'migrate' && (
                <div style={{ maxWidth: 420, margin: '20px auto 0', textAlign: 'left' }}>
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
                    Environment prerequisites
                  </div>
                  {prereqLoading && !prereqs ? (
                    <div style={{ fontSize: 12, color: 'var(--t2)' }}>Checking JDK, Maven, browsers…</div>
                  ) : prereqs ? (
                    <PrerequisiteCheckList
                      checks={prereqs.checks}
                      onInstallToolchain={() => void installToolchain()}
                      installBusy={toolchainBusy}
                    />
                  ) : null}
                </div>
              )}
              {detPhase === 2 && frameworkCatalog.length > 0 && (
                <div
                  style={{
                    marginTop: 20,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--t2)', width: '100%', marginBottom: 2 }}>
                    Enterprise catalog — more adapters shipping:
                  </span>
                  {frameworkCatalog
                    .filter((e) => !e.scaffoldSupported)
                    .map((a) => (
                      <Pill key={a.adapterId} color="var(--t2)">
                        {a.displayName}
                      </Pill>
                    ))}
                </div>
              )}
              {detPhase === 'failed' && wizardMode === 'migrate' && (
                <button
                  type="button"
                  onClick={() => project && void loadMigrationPlan(project.id)}
                  style={{
                    marginTop: 8,
                    height: 40,
                    padding: '0 16px',
                    border: '1px solid var(--b1)',
                    borderRadius: 9,
                    background: 'var(--bg2)',
                    color: 'var(--t0)',
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  Retry migration plan
                </button>
              )}
              {detPhase === 'failed' && wizardMode !== 'migrate' && (
                <button
                  type="button"
                  onClick={() => void runDetection()}
                  style={{
                    marginTop: 8,
                    height: 40,
                    padding: '0 16px',
                    border: '1px solid var(--b1)',
                    borderRadius: 9,
                    background: 'var(--bg2)',
                    color: 'var(--t0)',
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  Retry detection
                </button>
              )}
            </div>
          )}

          {step === 3 && (
            <AnalysisStep
              counts={counts}
              anaPhase={anaPhase}
              score={counts.understandingScore}
              flowNames={detectedFlows}
            />
          )}

          {step === 4 && project && (
            <ReadyStep project={project} framework={framework} score={counts.understandingScore} />
          )}
        </div>
      </div>

      <footer
        style={{
          borderTop: '1px solid var(--b0)',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ width: '100%', maxWidth: 520, display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => (step === 0 ? go('welcome') : setStep((s) => Math.max(0, s - 1) as WizardStep))}
            style={{
              height: 44,
              padding: '0 18px',
              border: '1px solid var(--b1)',
              borderRadius: 10,
              background: 'transparent',
              color: 'var(--t1)',
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            Back
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            disabled={!canNext}
            onClick={() => void handleNext()}
            style={{
              height: 44,
              padding: '0 22px',
              border: 'none',
              borderRadius: 10,
              background: canNext
                ? step === 4
                  ? 'linear-gradient(135deg,var(--acc),var(--ai))'
                  : 'var(--acc)'
                : 'var(--bg3)',
              color: canNext ? 'white' : 'var(--t2)',
              fontSize: 13.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: canNext && step === 4 ? '0 6px 20px rgba(91,140,239,0.3)' : 'none',
            }}
          >
            {nextLabel}
            <Icon d={IC.arrow} size={15} stroke={canNext ? 'white' : 'var(--t2)'} strokeWidth={2} />
          </button>
        </div>
      </footer>
    </div>
  );
}

function emptyProgress(): AnalysisProgress {
  return { pages: 0, tests: 0, pageObjects: 0, utils: 0, flows: 0, understandingScore: 0 };
}

function WizardProgressBar({
  step,
  wizardMode,
}: {
  step: WizardStep;
  wizardMode: WizardMode;
}): React.ReactElement {
  const labels = WIZARD_STEPS_BY_MODE[wizardMode];
  return (
    <div
      style={{
        maxWidth: 560,
        width: '100%',
        margin: '0 auto',
        padding: '20px 24px 0',
        display: 'flex',
        gap: 8,
        flexShrink: 0,
      }}
    >
      {labels.map((label, i) => (
        <div key={label} style={{ flex: 1 }}>
          <div
            style={{
              height: 3,
              borderRadius: 2,
              background: i <= step ? 'linear-gradient(90deg,var(--acc),var(--ai))' : 'var(--bg3)',
              transition: 'background 0.3s',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
            {i < step && <Icon d={IC.check} size={11} stroke="var(--ok)" strokeWidth={2.5} />}
            <span
              style={{
                fontSize: 11,
                fontWeight: i === step ? 700 : 500,
                color: i < step ? 'var(--ok)' : i === step ? 'var(--t0)' : 'var(--t2)',
              }}
            >
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div style={{ animation: 'slideU 0.3s ease' }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <p style={{ fontSize: 13.5, color: 'var(--t1)', marginBottom: 22 }}>{subtitle}</p>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 46,
  background: 'var(--bg2)',
  border: '1.5px solid var(--b1)',
  borderRadius: 9,
  padding: '0 14px',
  color: 'var(--t0)',
  fontSize: 14,
  fontFamily: 'var(--mono)',
  outline: 'none',
};

function DetectionIcon({
  done,
  failed = false,
}: {
  done: boolean;
  failed?: boolean;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26 }}>
      {done ? (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'var(--acc-bg)',
            border: '1px solid rgba(91,140,239,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon d={IC.check} size={32} stroke="var(--acc)" strokeWidth={2.5} />
        </div>
      ) : failed ? (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'rgba(239,91,91,0.08)',
            border: '1px solid rgba(239,91,91,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon d={IC.x} size={28} stroke="var(--err)" strokeWidth={2.5} />
        </div>
      ) : (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'var(--bg2)',
            border: '1px solid var(--b1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              border: '3px solid var(--b2)',
              borderTopColor: 'var(--acc)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}
    </div>
  );
}

function FrameworkRows({
  framework,
  fwDisplay,
}: {
  framework: Framework;
  fwDisplay: { name: string; version: string } | null;
}): React.ReactElement {
  const rows: ReadonlyArray<[string, string]> = [
    ['Build tool', framework.buildTool === 'unknown' ? '—' : framework.buildTool],
    ['Test framework', framework.testFramework],
    ['Adapter', fwDisplay ? `${fwDisplay.name} ${fwDisplay.version}` : '—'],
    [
      'Pattern',
      framework.pattern === 'page-object-model' ? 'Page Object Model' : framework.pattern,
    ],
  ];

  return (
    <div style={{ maxWidth: 340, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(([k, v]) => (
        <div
          key={k}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 13px',
            background: 'var(--bg2)',
            border: '1px solid var(--b1)',
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--t2)' }}>{k}</span>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: 'var(--mono)',
              color: k === 'Adapter' ? 'var(--acc)' : 'var(--t0)',
            }}
          >
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

function AnalysisStep({
  counts,
  anaPhase,
  score,
  flowNames,
}: {
  counts: AnalysisProgress;
  anaPhase: AnaPhase;
  score: number;
  flowNames: readonly string[];
}): React.ReactElement {
  const displayFlows = flowNames.length > 0 ? flowNames : ['Indexing flows…'];
  return (
    <div style={{ animation: 'slideU 0.3s ease' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          {anaPhase === 2 ? 'Repository understood' : 'Analyzing repository'}
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--t1)' }}>
          {anaPhase === 2
            ? 'Verity built a model of your application, tests and conventions.'
            : 'Indexing pages, page objects, utilities and business flows…'}
        </p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 18,
        }}
      >
        {(
          [
            ['Pages', counts.pages],
            ['Tests', counts.tests],
            ['Page Objects', counts.pageObjects],
            ['Utilities', counts.utils],
          ] as const
        ).map(([k, v]) => (
          <div
            key={k}
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--b1)',
              borderRadius: 10,
              padding: '14px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)' }}>{v}</div>
            <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3 }}>{k}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--b1)',
          borderRadius: 11,
          padding: '14px 16px',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--t2)', letterSpacing: 0.4 }}>
            BUSINESS FLOWS DETECTED
          </span>
          {anaPhase === 2 && counts.flows > 0 && (
            <Pill color="var(--ok)" background="var(--ok-dim)" border="rgba(67,181,129,0.3)">
              {counts.flows} flows
            </Pill>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {displayFlows.map((f, i) => (
            <span
              key={f}
              style={{
                padding: '4px 10px',
                background: 'var(--bg3)',
                border: '1px solid var(--b1)',
                borderRadius: 7,
                fontSize: 11.5,
                opacity: anaPhase === 2 ? 1 : 0.4,
                transition: `opacity 0.3s ${i * 0.07}s`,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {anaPhase === 2 && (
                <span
                  style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)' }}
                />
              )}
              {f}
            </span>
          ))}
        </div>
      </div>
      <ScoreRing score={anaPhase === 2 ? score : Math.min(score, 40)} done={anaPhase === 2} />
    </div>
  );
}

function ScoreRing({ score, done }: { score: number; done: boolean }): React.ReactElement {
  const r = 19;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--acc-bg)',
        border: '1px solid rgba(91,140,239,0.25)',
        borderRadius: 11,
      }}
    >
      <div style={{ position: 'relative', width: 46, height: 46, flexShrink: 0 }}>
        <svg width="46" height="46" viewBox="0 0 46 46">
          <circle cx="23" cy="23" r={r} fill="none" stroke="var(--bg4)" strokeWidth="4" />
          <circle
            cx="23"
            cy="23"
            r={r}
            fill="none"
            stroke="var(--acc)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={done ? offset : circumference}
            transform="rotate(-90 23 23)"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--mono)',
            color: 'var(--acc)',
          }}
        >
          {score}%
        </span>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--acc)' }}>
          Repository Understanding Score
        </div>
        <div style={{ fontSize: 12, color: 'var(--t1)', marginTop: 2 }}>
          Structure, conventions and locators mapped with confidence.
        </div>
      </div>
    </div>
  );
}

function ReadyStep({
  project,
  framework,
  score,
}: {
  project: Project;
  framework: Framework | null;
  score: number;
}): React.ReactElement {
  const fw = framework ? formatFramework(framework) : null;
  return (
    <div style={{ textAlign: 'center', paddingTop: 20, animation: 'slideU 0.3s ease' }}>
      <div
        style={{
          width: 64,
          height: 64,
          margin: '0 auto 18px',
          borderRadius: 16,
          background: 'var(--ok-dim)',
          border: '1px solid rgba(67,181,129,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon d={IC.check} size={32} stroke="var(--ok)" strokeWidth={2.5} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Workspace ready</div>
      <p style={{ fontSize: 14, color: 'var(--t1)', maxWidth: 400, margin: '0 auto 24px', lineHeight: '21px' }}>
        Your repository is connected and understood. Open the workspace to author your first AI-assisted
        test.
      </p>
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          gap: 8,
          padding: '14px 18px',
          background: 'var(--bg2)',
          border: '1px solid var(--b1)',
          borderRadius: 11,
          textAlign: 'left',
        }}
      >
        {[
          ['Repository', project.repository.path || project.repository.slug],
          ['Adapter', fw ? `${fw.name} ${fw.version}` : '—'],
          ['Understanding', `${score}%`],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 24, fontSize: 12.5 }}>
            <span style={{ color: 'var(--t2)', width: 90 }}>{k}</span>
            <span style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{v}</span>
          </div>
        ))}
      </div>
      {fw && (
        <div style={{ marginTop: 16 }}>
          <AdapterBadge framework={fw.name} version={fw.version} />
        </div>
      )}
    </div>
  );
}

function FolderInspectionBanner({
  inspection,
  wizardMode,
}: {
  inspection: FolderInspectionDto;
  wizardMode: WizardMode;
}): React.ReactElement {
  const warn =
    (wizardMode === 'greenfield' && !inspection.isEmpty) ||
    (wizardMode === 'migrate' && inspection.entryKind !== 'selenium-java') ||
    (wizardMode === 'existing' && inspection.isEmpty);

  return (
    <div
      style={{
        marginTop: 14,
        padding: '12px 14px',
        borderRadius: 9,
        background: warn ? 'rgba(239,91,91,0.08)' : 'var(--acc-bg)',
        border: `1px solid ${warn ? 'rgba(239,91,91,0.35)' : 'rgba(91,140,239,0.25)'}`,
        fontSize: 12.5,
        lineHeight: 1.5,
        color: 'var(--t1)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{inspection.headline}</div>
      <div style={{ color: 'var(--t2)' }}>{inspection.detail}</div>
      {warn ? (
        <div style={{ marginTop: 8, color: 'var(--err)', fontWeight: 600 }}>
          {wizardMode === 'greenfield'
            ? 'Choose an empty folder to scaffold.'
            : wizardMode === 'migrate'
              ? 'This folder does not look like Selenium Java.'
              : 'This folder is empty — try Start fresh instead.'}
        </div>
      ) : null}
    </div>
  );
}

function MigrationPlanPanel({ plan }: { plan: MigrationPlanDto }): React.ReactElement {
  return (
    <div
      style={{
        maxWidth: 440,
        margin: '0 auto',
        textAlign: 'left',
        padding: '14px 16px',
        background: 'var(--bg2)',
        border: '1px solid var(--b1)',
        borderRadius: 11,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--t2)', marginBottom: 10 }}>
        {plan.sourceAdapter} → {plan.targetAdapter} · {plan.estimatedEffort} effort
      </div>
      {plan.steps.map((step) => (
        <div key={step.phase} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>
            {step.phase}. {step.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4, lineHeight: 1.45 }}>{step.detail}</div>
        </div>
      ))}
    </div>
  );
}
