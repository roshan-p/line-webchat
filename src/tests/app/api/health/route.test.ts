import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/health/route';
import { makeUser } from '@/tests/helpers';

const getUsers = vi.fn();

vi.mock('@/lib/store', () => ({
  getUsers: (...args: unknown[]) => getUsers(...args),
}));

vi.mock('@/lib/persistent-store', () => ({
  getStorageBackend: () => 'memory',
  isPersistenceConfigured: () => false,
}));

vi.mock('@/lib/ably', () => ({
  isAblyConfigured: () => true,
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
});

describe('GET /api/health', () => {
  it('reports what the UI needs to choose polling or realtime', async () => {
    getUsers.mockResolvedValue([makeUser(), makeUser({ userId: 'U2' })]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'ok',
      storage: 'memory',
      persistent: false,
      realtime: true,
      userCount: 2,
      webhookUrl: 'http://localhost:3000/api/webhook',
    });
  });
});
