import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useServerConfig } from '@/hooks/useServerConfig';

const fetchServerConfig = vi.fn();

vi.mock('@/lib/api-client', () => ({
  fetchServerConfig: (...args: unknown[]) => fetchServerConfig(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useServerConfig', () => {
  it('assumes persistence until the health check answers', () => {
    fetchServerConfig.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useServerConfig());

    expect(result.current).toEqual({ persistent: true, realtime: false });
  });

  it('maps the health response into UI flags', async () => {
    fetchServerConfig.mockResolvedValue({ persistent: false, realtime: true });

    const { result } = renderHook(() => useServerConfig());

    await waitFor(() =>
      expect(result.current).toEqual({ persistent: false, realtime: true }),
    );
  });

  it('falls back to the least capable setup when the health check fails', async () => {
    fetchServerConfig.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useServerConfig());

    await waitFor(() =>
      expect(result.current).toEqual({ persistent: false, realtime: false }),
    );
  });
});
