import type { Project } from '@verity/core';

/**
 * Workspace layout skeleton (architecture §2.2, locked prototype three-panel
 * metaphor: Repository | center work surface | AI Studio, with a bottom panel).
 *
 * EPIC 0 ships the STRUCTURE only — panels, toolbar, regions — with no behavior.
 * Later epics fill the left repository tree (E1), AI Studio (E4), execution
 * timeline (E5), and git panel (E6). Wiring those into this frame requires no
 * structural change.
 */
function Panel({ title, children, width }: { title: string; children?: React.ReactNode; width?: number }) {
  return (
    <div
      style={{
        width,
        flex: width ? undefined : 1,
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
          padding: '0 12px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: 'var(--t2)',
        }}
      >
        {title}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 12, color: 'var(--t2)', fontSize: 12.5 }}>
        {children ?? <Placeholder />}
      </div>
    </div>
  );
}

function Placeholder() {
  return (
    <div style={{ opacity: 0.7, lineHeight: '18px' }}>
      Foundation skeleton — populated in a later epic.
    </div>
  );
}

export function WorkspaceScreen({ project }: { project: Project | null }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
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
        <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--mono)' }}>
          {project?.repository.slug ?? 'no repository connected'}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--t2)' }}>
          {project ? `${project.framework.adapterId} · ${project.framework.version}` : ''}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
          status: {project?.status ?? '—'}
        </span>
      </div>

      {/* Body: three panels */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <Panel title="Repository" width={248} />
        <Panel title="Interactive Browser" />
        <div
          style={{
            width: 330,
            flexShrink: 0,
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
              padding: '0 12px',
              gap: 8,
              background: 'var(--ai-bg)',
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            AI Test Studio
          </div>
          <div style={{ flex: 1, padding: 12, color: 'var(--t2)', fontSize: 12.5 }}>
            <Placeholder />
          </div>
        </div>
      </div>

      {/* Bottom panel */}
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
            padding: '0 12px',
            fontSize: 11.5,
            color: 'var(--t2)',
          }}
        >
          AI Reasoning · Execution Logs · Git Activity
        </div>
        <div style={{ flex: 1, padding: 12, color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
          Bottom panel reserved for reasoning/logs/git output.
        </div>
      </div>
    </div>
  );
}
