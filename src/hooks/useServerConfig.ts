'use client';

import { useEffect, useState } from 'react';
import { fetchServerConfig } from '@/lib/api-client';
import type { ServerConfig } from '@/types/chat';

/**
 * Reports which optional backends the server has configured. Assumes the least
 * capable setup until the health check answers, so no feature is shown as
 * available before it is confirmed.
 */
export function useServerConfig(): ServerConfig {
  const [config, setConfig] = useState<ServerConfig>({
    persistent: true,
    realtime: false,
  });

  useEffect(() => {
    fetchServerConfig()
      .then(setConfig)
      .catch(() => setConfig({ persistent: false, realtime: false }));
  }, []);

  return config;
}
