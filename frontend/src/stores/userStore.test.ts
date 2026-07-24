import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserStore } from './userStore';
import * as client from '../api/client';
import type { User } from '../schemas/domain';

const agent: User = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Agent',
  email: 'agent@example.com',
  role: 'agent',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('userStore', () => {
  beforeEach(() => {
    useUserStore.setState({
      users: [],
      loading: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  it('createUser appends to list', async () => {
    vi.spyOn(client, 'createUserApi').mockResolvedValue({
      ok: true,
      data: agent,
    });
    const created = await useUserStore.getState().createUser({
      name: 'Agent',
      email: 'agent@example.com',
      role: 'agent',
      password: 'password123',
    });
    expect(created).toEqual(agent);
    expect(useUserStore.getState().users).toEqual([agent]);
  });

  it('deleteUser removes from list', async () => {
    useUserStore.setState({ users: [agent] });
    vi.spyOn(client, 'deleteUserApi').mockResolvedValue({
      ok: true,
      data: null,
    });
    const ok = await useUserStore.getState().deleteUser(agent.id);
    expect(ok).toBe(true);
    expect(useUserStore.getState().users).toEqual([]);
  });
});
