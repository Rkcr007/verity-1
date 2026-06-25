import { useEffect, useState } from 'react';
import type { AiCapabilitiesResponse } from '@verity/core/ipc';
import { invoke } from '../ipc/client.js';

/**
 * OfflineBanner — S-11 when Claude API key is not configured (M7).
 */
export function OfflineBanner(): React.ReactElement | null {
  const [capabilities, setCapabilities] = useState<AiCapabilitiesResponse | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const result = await invoke('ai:get-capabilities', undefined);
        setCapabilities(result);
      } catch {
        setCapabilities({ llmAvailable: false, mode: 'rules' });
      }
    })();
  }, []);

  if (!capabilities || capabilities.llmAvailable) return null;

  return (
    <div
      style={{
        flexShrink: 0,
        padding: '8px 14px',
        background: 'rgba(224, 163, 58, 0.12)',
        borderBottom: '1px solid rgba(224, 163, 58, 0.25)',
        color: 'var(--mod, #E0A33A)',
        fontSize: 12,
        lineHeight: '16px',
      }}
    >
      AI is running in offline rules mode — set <span style={{ fontFamily: 'var(--mono)' }}>ANTHROPIC_API_KEY</span>{' '}
      and restart Verity for Claude-powered step generation.
    </div>
  );
}
