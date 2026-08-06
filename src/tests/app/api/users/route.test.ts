import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/users/route';
import { makeUser } from '@/tests/helpers';

const getUsers = vi.fn();

vi.mock('@/lib/store', () => ({
  getUsers: (...args: unknown[]) => getUsers(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/users', () => {
  it('returns the conversation list', async () => {
    const users = [makeUser()];
    getUsers.mockResolvedValue(users);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ users });
  });
});
