import type { Project } from '@verity/core';
import { VerityError } from '@verity/core';
import { AdapterBadge } from '../../components/AdapterBadge.js';
import { GitMark } from '../../components/GitMark.js';
import { IC, Icon } from '../../components/Icon.js';
import { Pill } from '../../components/Pill.js';
import { ChromeScreenHeader } from '../../components/ChromeScreenHeader.js';
import { useProjects } from '../../store/project-store.js';
import { useRouter } from '../../store/router-store.js';
import { useToast } from '../../store/toast-store.js';
import { formatFramework, formatRepoSlug } from '../../utils/display.js';

/**
 * Projects — connected repository list (locked prototype, EPIC 0 / M0).
 * Reads projects from SQLite via IPC; opening a card sets the active project
 * and navigates to the workspace.
 */
export function ProjectsScreen(): React.ReactElement {
  const projects = useProjects((s) => s.projects);
  const active = useProjects((s) => s.active);
  const loading = useProjects((s) => s.loading);
  const error = useProjects((s) => s.error);
  const openProject = useProjects((s) => s.openProject);
  const go = useRouter((s) => s.go);
  const startCreate = useRouter((s) => s.startCreate);
  const toast = useToast((s) => s.show);

  const handleOpen = async (project: Project): Promise<void> => {
    try {
      await openProject(project.id);
      go('workspace');
      toast(`Opened ${project.name}`);
    } catch (error) {
      const message =
        error instanceof VerityError
          ? error.userMessage
          : error instanceof Error
            ? error.message
            : 'Could not open project';
      toast(message, 'err');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ChromeScreenHeader>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Projects</span>
        <Pill>{projects.length} repos</Pill>
        <div style={{ flex: 1 }} />
        <div
          style={{
            height: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg2)',
            border: '1px solid var(--b1)',
            borderRadius: 7,
            padding: '0 10px',
          }}
        >
          <Icon d={IC.search} size={13} stroke="var(--t2)" />
          <input
            placeholder="Search repositories…"
            disabled
            title="Search ships in M1"
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--t1)',
              fontSize: 12,
              width: 160,
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => startCreate('existing')}
          style={{
            height: 32,
            padding: '0 13px',
            background: 'var(--acc)',
            border: 'none',
            borderRadius: 7,
            color: 'white',
            fontSize: 12.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon d={IC.plus} size={14} stroke="white" strokeWidth={2} />
          Connect repo
        </button>
      </ChromeScreenHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {error ? (
          <div style={{ color: 'var(--err)', fontSize: 13, marginBottom: 12 }}>{error}</div>
        ) : null}

        {loading ? (
          <div style={{ color: 'var(--t2)', fontSize: 13 }}>Loading projects…</div>
        ) : (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--t2)',
                letterSpacing: 0.6,
                marginBottom: 12,
              }}
            >
              CONNECTED REPOSITORIES
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
                gap: 12,
              }}
            >
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isOpen={active?.id === project.id}
                  onOpen={() => void handleOpen(project)}
                />
              ))}
              <ConnectSlot onClick={() => startCreate('existing')} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  isOpen,
  onOpen,
}: {
  project: Project;
  isOpen: boolean;
  onOpen: () => void;
}): React.ReactElement {
  const fw = formatFramework(project.framework);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--b1)',
        borderRadius: 12,
        padding: 16,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--b2)';
        e.currentTarget.style.background = 'var(--bg3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--b1)';
        e.currentTarget.style.background = 'var(--bg2)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
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
          <GitMark source={project.repository.source} size={17} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {project.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--t2)',
              fontFamily: 'var(--mono)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {formatRepoSlug(project)}
          </div>
        </div>
        {isOpen ? (
          <Pill color="var(--ok)" background="var(--ok-dim)" border="rgba(67,181,129,0.3)">
            open
          </Pill>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <AdapterBadge framework={fw.name} version={fw.version} small />
        <Pill>
          <Icon d={IC.branch} size={11} />
          {project.repository.defaultBranch}
        </Pill>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Stat value={project.stats.tests} label="tests" />
        <Stat value={project.stats.pages} label="pages" />
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'var(--mono)',
              color: 'var(--acc)',
            }}
          >
            {project.stats.understandingScore}%
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--t2)' }}>understood</div>
        </div>
      </div>
    </button>
  );
}

function Stat({ value, label }: { value: number; label: string }): React.ReactElement {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)' }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--t2)' }}>{label}</div>
    </div>
  );
}

function ConnectSlot({ onClick }: { onClick: () => void }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 170,
        background: 'transparent',
        border: '1.5px dashed var(--b1)',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        color: 'var(--t2)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'var(--bg2)',
          border: '1px solid var(--b1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon d={IC.plus} size={19} stroke="var(--t1)" />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Connect a repository</div>
    </button>
  );
}
