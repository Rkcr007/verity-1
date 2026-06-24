import { useEffect } from 'react';

/**
 * Sets `data-platform` on document.body so CSS can apply macOS title-bar inset.
 */
export function usePlatformChrome(): { isMac: boolean } {
  const platform =
    typeof window !== 'undefined' && 'verity' in window ? window.verity.platform : 'web';

  useEffect(() => {
    document.body.dataset.platform = platform;
    return () => {
      delete document.body.dataset.platform;
    };
  }, [platform]);

  return { isMac: platform === 'darwin' };
}
