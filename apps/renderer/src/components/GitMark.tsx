import type { RepositorySource } from '@verity/core';

/**
 * GitMark — GitHub / GitLab logo switcher from the locked prototype.
 */
export interface GitMarkProps {
  source: RepositorySource;
  size?: number;
}

function GitHubLogo({ size }: { size: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--t0)">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function GitLabLogo({ size }: { size: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#E24329">
      <path d="M22.65 9.5l-1.1-3.4a.9.9 0 00-.85-.6H3.3a.9.9 0 00-.85.6L1.35 9.5a.5.5 0 00.18.57l9.47 6.9-9.47 6.9a.5.5 0 00-.18.57l1.1 3.4a.9.9 0 00.85.6h17.4a.9.9 0 00.85-.6l1.1-3.4a.5.5 0 00-.18-.57L13.35 16.97l9.47-6.9a.5.5 0 00.18-.57z" />
    </svg>
  );
}

function FolderLogo({ size }: { size: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--t1)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7h5l2 3h11v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

export function GitMark({ source, size = 15 }: GitMarkProps): React.ReactElement {
  if (source === 'gitlab') return <GitLabLogo size={size} />;
  if (source === 'local') return <FolderLogo size={size} />;
  return <GitHubLogo size={size} />;
}
