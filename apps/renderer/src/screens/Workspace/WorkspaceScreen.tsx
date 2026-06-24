import { useEffect } from 'react';
import type { Project } from '@verity/core';
import { GitMark } from '../../components/GitMark.js';
import { useSemanticStore } from '../../store/semantic-store.js';
import { formatFramework, formatRepoSlug, formatWorkspaceStatus } from '../../utils/display.js';
import { AiStudioReadOnlyPanel } from './AiStudioReadOnlyPanel.js';
import { WorkspaceLeftPanel } from './WorkspaceLeftPanel.js';

/**
 * Workspace layout (architecture §2.2). M2 adds the left Semantic Tests panel
 * and read-only AI Studio; later epics fill browser, execution, and git panels.
 */
export function WorkspaceScreen({ project }: { project: Project | null }) {
  const selectedSlug = useSemanticStore((s) => s.selectedSlug);
  const selectedTest = useSemanticStore((s) => s.selectedTest);
  const loadingDetail = useSemanticStore((s) => s.loadingDetail);
  const selectTest = useSemanticStore((s) => s.selectTest);
  const clearSelection = useSemanticStore((s) => s.clearSelection);

  useEffect(() => {
    clearSelection();
  }, [project?.id, clearSelection]);

  if (!project) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--t2)', fontSize: 13 }}>Open a project to enter the workspace.</span>
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
        <GitMark source={project.repository.source} size={14} />
        <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--mono)' }}>
          {formatRepoSlug(project)}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--t2)' }}>
          {fw.name} · {fw.version}
        </span>
        <div style={{ flex: 1 }} />
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
              padding: '0 12px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: 'var(--t2)',
            }}
          >
            Interactive Browser
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12, color: 'var(--t2)', fontSize: 12.5 }}>
            <div style={{ opacity: 0.7, lineHeight: '18px' }}>
              Browser surface ships in a later epic. Select a semantic test on the left to preview
              steps in AI Studio.
            </div>
          </div>
        </div>

        <AiStudioReadOnlyPanel test={selectedTest} loading={loadingDetail} />
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
