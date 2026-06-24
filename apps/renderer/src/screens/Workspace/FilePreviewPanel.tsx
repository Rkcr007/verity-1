import type { ReadRepositoryFileResponse } from '@verity/core/ipc';
import { IC, Icon } from '../../components/Icon.js';

interface FilePreviewPanelProps {
  path: string | null;
  preview: ReadRepositoryFileResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * Read-only editor surface for repository files (Cursor-style preview).
 */
export function FilePreviewPanel({
  path,
  preview,
  loading,
  error,
}: FilePreviewPanelProps): React.ReactElement {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          height: 34,
          borderBottom: '1px solid var(--b0)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <Icon d={IC.page} size={14} stroke="var(--t2)" />
        <span
          style={{
            fontSize: 11.5,
            fontFamily: 'var(--mono)',
            color: 'var(--t0)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {path ?? 'Select a file'}
        </span>
        {preview ? (
          <span style={{ fontSize: 10, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
            {preview.language}
            {preview.truncated ? ' · truncated' : ''}
          </span>
        ) : null}
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: 16, fontSize: 12, color: 'var(--t2)' }}>Loading file…</div>
        ) : error ? (
          <div style={{ padding: 16, fontSize: 12, color: 'var(--err)' }}>{error}</div>
        ) : !path ? (
          <div style={{ padding: 16, fontSize: 12.5, color: 'var(--t2)', lineHeight: '18px' }}>
            Open a file from the Repository tree on the left. Verity reads your repo locally — the
            same way Cursor uses your workspace for AI context.
          </div>
        ) : preview ? (
          <pre
            style={{
              margin: 0,
              padding: '12px 16px',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              lineHeight: '18px',
              color: 'var(--t0)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {preview.content}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
