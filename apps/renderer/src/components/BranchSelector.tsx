import { useEffect, useRef, useState } from 'react';
import type { WorkspaceId } from '@verity/core';
import { Icon, IC } from './Icon.js';
import { Pill } from './Pill.js';
import { invoke } from '../ipc/client.js';
import { useGitStore } from '../store/git-store.js';
import { useToast } from '../store/toast-store.js';

interface BranchSelectorProps {
  projectId: WorkspaceId;
  branch: string;
  branchPrefix?: string;
}

/**
 * BranchSelector — dropdown to switch or create local branches (M6 E6-S4).
 */
export function BranchSelector({
  projectId,
  branch,
  branchPrefix = 'verity/',
}: BranchSelectorProps): React.ReactElement {
  const toast = useToast((s) => s.show);
  const checkoutBranch = useGitStore((s) => s.checkoutBranch);
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<readonly string[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      setLoading(true);
      try {
        const result = await invoke('git:list-branches', { projectId });
        setBranches(result.branches);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Could not load branches', 'err');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, projectId, toast]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handleSelect = (name: string): void => {
    if (name === branch) {
      setOpen(false);
      return;
    }
    void checkoutBranch(projectId, name)
      .then(() => {
        toast(`Switched to ${name}`);
        setOpen(false);
      })
      .catch((error) => {
        toast(error instanceof Error ? error.message : 'Branch switch failed', 'err');
      });
  };

  const handleCreate = (): void => {
    const slug = window.prompt('New branch name (prefix added automatically):', 'test-branch');
    if (!slug?.trim()) return;
    const name = slug.startsWith(branchPrefix) ? slug.trim() : `${branchPrefix}${slug.trim()}`;
    void checkoutBranch(projectId, name, true)
      .then(() => {
        toast(`Created and switched to ${name}`);
        setOpen(false);
      })
      .catch((error) => {
        toast(error instanceof Error ? error.message : 'Could not create branch', 'err');
      });
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 26,
          padding: '0 10px',
          border: '1px solid var(--b1)',
          borderRadius: 20,
          background: 'var(--bg2)',
          color: 'var(--t0)',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Icon d={IC.branch} size={11} stroke="var(--t1)" />
        {branch}
        <Icon d={IC.chevDown} size={12} stroke="var(--t2)" />
      </button>

      {open ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: 200,
            maxHeight: 260,
            overflowY: 'auto',
            background: 'var(--bg1)',
            border: '1px solid var(--b2)',
            borderRadius: 10,
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            zIndex: 200,
            padding: 6,
          }}
        >
          <div
            style={{
              padding: '6px 8px',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--t2)',
              letterSpacing: 0.4,
            }}
          >
            LOCAL BRANCHES
          </div>
          {loading ? (
            <div style={{ padding: '8px 10px', fontSize: 11.5, color: 'var(--t2)' }}>Loading…</div>
          ) : (
            branches.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleSelect(name)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: 6,
                  background: name === branch ? 'var(--acc-dim)' : 'transparent',
                  color: 'var(--t0)',
                  fontSize: 11.5,
                  fontFamily: 'var(--mono)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {name}
                {name === branch ? (
                  <Pill color="var(--acc)" background="var(--acc-dim)" border="transparent">
                    current
                  </Pill>
                ) : null}
              </button>
            ))
          )}
          <div style={{ borderTop: '1px solid var(--b0)', margin: '6px 0' }} />
          <button
            type="button"
            onClick={handleCreate}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--acc)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Icon d={IC.plus} size={13} stroke="var(--acc)" />
            New branch…
          </button>
        </div>
      ) : null}
    </div>
  );
}
