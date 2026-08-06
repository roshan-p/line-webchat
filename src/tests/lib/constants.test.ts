import { describe, expect, it } from 'vitest';
import {
  LOCALE,
  POLL_INTERVAL_MS,
  REALTIME_CHANNEL,
  SIDEBAR_SKELETON_ROWS,
} from '@/lib/constants';

describe('constants', () => {
  it('keeps the publisher and subscriber on the same channel name', () => {
    expect(REALTIME_CHANNEL).toBe('line-webchat');
  });

  it('uses a five second fallback poll while realtime is down', () => {
    expect(POLL_INTERVAL_MS).toBe(5000);
  });

  it('formats times for Thai users', () => {
    expect(LOCALE).toBe('th-TH');
  });

  it('shows enough skeleton rows to fill the sidebar while loading', () => {
    expect(SIDEBAR_SKELETON_ROWS).toBeGreaterThan(0);
  });
});
