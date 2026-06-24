import type { ReactNode } from 'react';
import { ChromeHomeButton } from './ChromeHomeButton.js';

interface ChromeScreenHeaderProps {
  readonly children: ReactNode;
  readonly minHeight?: number;
}

/**
 * Shared header for ActivityRail screens — includes macOS title-bar inset + Home.
 */
export function ChromeScreenHeader({
  children,
  minHeight = 48,
}: ChromeScreenHeaderProps): React.ReactElement {
  return (
    <header
      style={{
        minHeight: `calc(${minHeight}px + var(--titlebar-inset))`,
        paddingTop: 'var(--titlebar-inset)',
        borderBottom: '1px solid var(--b0)',
        background: 'var(--bg1)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 18,
        paddingRight: 18,
        gap: 10,
        flexShrink: 0,
      }}
    >
      <ChromeHomeButton label="" />
      {children}
    </header>
  );
}
