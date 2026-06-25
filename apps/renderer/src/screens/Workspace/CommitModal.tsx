import { useEffect, useState } from 'react';
import type { Project } from '@verity/core';
import type { GitChangeDto } from '@verity/core/ipc';
import { DiffViewer } from '../../components/DiffViewer.js';
import { Icon, IC } from '../../components/Icon.js';
import { Pill } from '../../components/Pill.js';
import { useGitStore } from '../../store/git-store.js';
import { useToast } from '../../store/toast-store.js';

interface CommitModalProps {
  project: Project;
  changes: readonly GitChangeDto[];
  branch: string;
  onClose: () => void;
}

/**
 * CommitModal — review diffs, edit message, commit & push selected files.
 */
export function CommitModal({
  project,
  changes,
  branch,
  onClose,
}: CommitModalProps): React.ReactElement {
  const toast = useToast((s) => s.show);
  const selectedPath = useGitStore((s) => s.selectedDiffPath);
  const diffLines = useGitStore((s) => s.diffLines);
  const diffLoading = useGitStore((s) => s.diffLoading);
  const committing = useGitStore((s) => s.committing);
  const pushError = useGitStore((s) => s.pushError);
  const commitSucceeded = useGitStore((s) => s.commitSucceeded);
  const hasMergeConflicts = useGitStore((s) => s.status?.hasMergeConflicts ?? false);
  const loadDiff = useGitStore((s) => s.loadDiff);
  const commitAndPush = useGitStore((s) => s.commitAndPush);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<ReadonlySet<string>>(
    () => new Set(changes.map((change) => change.path)),
  );
  const [message, setMessage] = useState('test: update semantic test artifacts');

  useEffect(() => {
    const path = changes[selectedIndex]?.path;
    if (!path) return;
    void loadDiff(project.id, path);
  }, [project.id, changes, selectedIndex, loadDiff]);

  useEffect(() => {
    if (!selectedPath) return;
    const index = changes.findIndex((change) => change.path === selectedPath);
    if (index >= 0) setSelectedIndex(index);
  }, [selectedPath, changes]);

  const activeChange = changes[selectedIndex] ?? changes[0];

  const toggleFile = (path: string): void => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleCommit = (): void => {
    if (hasMergeConflicts) {
      toast('Resolve merge conflicts before committing', 'err');
      return;
    }
    const files = [...selectedFiles];
    if (files.length === 0) {
      toast('Select at least one file to commit', 'err');
      return;
    }
    void commitAndPush(project.id, message, files).catch((error) => {
      toast(error instanceof Error ? error.message : 'Commit failed', 'err');
    });
  };

  const handleClose = (): void => {
    if (commitSucceeded) {
      toast('Changes committed locally', 'info');
    }
    onClose();
  };

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 8, 12, 0.7)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={handleClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="commit-modal-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 880,
          maxWidth: '100%',
          height: 560,
          maxHeight: '90vh',
          background: 'var(--bg1)',
          border: '1px solid var(--b2)',
          borderRadius: 14,
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 48,
            borderBottom: '1px solid var(--b0)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px',
            flexShrink: 0,
          }}
        >
          <Icon d={IC.git} size={17} stroke="var(--t1)" />
          <span id="commit-modal-title" style={{ fontSize: 14, fontWeight: 700 }}>
            Review &amp; commit
          </span>
          <Pill color="var(--t1)" background="var(--bg3)" border="var(--b1)">
            <Icon d={IC.branch} size={11} stroke="var(--t1)" /> {branch}
          </Pill>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close commit dialog"
            style={{
              width: 30,
              height: 30,
              border: 'none',
              background: 'var(--bg3)',
              color: 'var(--t1)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Icon d={IC.x} size={15} stroke="var(--t1)" />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div
            style={{
              width: 240,
              flexShrink: 0,
              borderRight: '1px solid var(--b0)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '10px 12px 6px',
                fontSize: 10.5,
                fontWeight: 700,
                color: 'var(--t2)',
                letterSpacing: 0.5,
              }}
            >
              CHANGED FILES ({changes.length})
            </div>
            {changes.map((change, index) => (
              <button
                key={change.path}
                type="button"
                onClick={() => setSelectedIndex(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  border: 'none',
                  borderLeft: `2px solid ${selectedIndex === index ? 'var(--acc)' : 'transparent'}`,
                  background: selectedIndex === index ? 'var(--bg3)' : 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(change.path)}
                  onChange={() => toggleFile(change.path)}
                  onClick={(event) => event.stopPropagation()}
                  style={{ flexShrink: 0 }}
                />
                <span
                  style={{
                    width: 13,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--mono)',
                    color: change.type === 'A' ? 'var(--ok)' : 'var(--mod, #E0A33A)',
                  }}
                >
                  {change.type}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 11.5,
                    fontFamily: 'var(--mono)',
                    color: 'var(--t0)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {change.fileName}
                </span>
              </button>
            ))}

            {activeChange?.summary ? (
              <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid var(--b0)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <Icon d={IC.spark} size={13} stroke="var(--ai, var(--acc))" />
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: 'var(--ai, var(--acc))',
                      letterSpacing: 0.4,
                    }}
                  >
                    AI CHANGE SUMMARY
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--t1)', lineHeight: '16px' }}>
                  {activeChange.summary}
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div
              style={{
                height: 32,
                borderBottom: '1px solid var(--b0)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 14px',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 11.5, fontFamily: 'var(--mono)', fontWeight: 600 }}>
                {activeChange?.path ?? '—'}
              </span>
              {activeChange ? (
                <Pill
                  color={activeChange.type === 'A' ? 'var(--ok)' : 'var(--mod, #E0A33A)'}
                  background="var(--bg3)"
                  border="transparent"
                >
                  {activeChange.type === 'A' ? 'new file' : activeChange.type === 'D' ? 'deleted' : 'modified'}
                </Pill>
              ) : null}
            </div>

            {diffLoading ? (
              <div style={{ padding: 12, color: 'var(--t2)', fontSize: 12 }}>Loading diff…</div>
            ) : (
              <DiffViewer lines={diffLines} />
            )}

            {pushError ? (
              <div
                style={{
                  margin: '0 12px',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(229, 100, 94, 0.12)',
                  border: '1px solid rgba(229, 100, 94, 0.3)',
                  color: 'var(--err)',
                  fontSize: 12,
                  lineHeight: '16px',
                }}
              >
                <strong>Push rejected (S-07).</strong> {pushError}
                {commitSucceeded ? (
                  <div style={{ marginTop: 6, color: 'var(--t1)' }}>
                    Your commit was saved locally. Pull or rebase on the remote branch, then push again
                    from your terminal or retry here.
                  </div>
                ) : null}
              </div>
            ) : null}

            {hasMergeConflicts ? (
              <div
                style={{
                  margin: '0 12px',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(229, 100, 94, 0.12)',
                  border: '1px solid rgba(229, 100, 94, 0.3)',
                  color: 'var(--err)',
                  fontSize: 12,
                }}
              >
                Merge conflicts detected (S-06). Resolve conflicts in your editor before committing.
              </div>
            ) : null}

            <div style={{ borderTop: '1px solid var(--b0)', padding: 12, flexShrink: 0 }}>
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  background: 'var(--bg2)',
                  border: '1px solid var(--b1)',
                  borderRadius: 8,
                  padding: '0 11px',
                  color: 'var(--t0)',
                  fontSize: 12.5,
                  fontFamily: 'var(--mono)',
                  outline: 'none',
                  marginBottom: 9,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--t2)' }}>
                  Commits to your repo · nothing stored by Verity
                </span>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={committing}
                  style={{
                    height: 34,
                    padding: '0 14px',
                    border: '1px solid var(--b1)',
                    borderRadius: 8,
                    background: 'transparent',
                    color: 'var(--t1)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={committing || hasMergeConflicts || Boolean(pushError && commitSucceeded)}
                  style={{
                    height: 34,
                    padding: '0 16px',
                    border: 'none',
                    borderRadius: 8,
                    background: committing ? 'var(--bg3)' : 'var(--acc)',
                    color: committing ? 'var(--t2)' : 'white',
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    cursor: committing ? 'default' : 'pointer',
                  }}
                >
                  <Icon d={IC.git} size={14} stroke={committing ? 'var(--t2)' : 'white'} />
                  {committing ? 'Committing…' : 'Commit & Push'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
