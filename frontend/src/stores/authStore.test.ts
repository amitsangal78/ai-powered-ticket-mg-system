import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './authStore';
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

describe('authStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      hydrated: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  it('hydrates with no token as logged out', async () => {
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      hydrated: true,
    });
  });

  it('login stores token and user', async () => {
    vi.spyOn(client, 'loginApi').mockResolvedValue({
      ok: true,
      data: { token: 'jwt-token', user: agent },
    });

    const ok = await useAuthStore.getState().login(
      'agent@example.com',
      'password',
    );
    expect(ok).toBe(true);
    expect(sessionStorage.getItem('ticket_mg_jwt')).toBe('jwt-token');
    expect(useAuthStore.getState().user?.email).toBe('agent@example.com');
    expect(useAuthStore.getState().hydrated).toBe(true);
  });

  it('clearSession removes token', () => {
    sessionStorage.setItem('ticket_mg_jwt', 'x');
    useAuthStore.setState({ user: agent, token: 'x', hydrated: true });
    useAuthStore.getState().clearSession();
    expect(sessionStorage.getItem('ticket_mg_jwt')).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('hydrate loads user via meApi when token present', async () => {
    sessionStorage.setItem('ticket_mg_jwt', 'jwt-token');
    vi.spyOn(client, 'meApi').mockResolvedValue({ ok: true, data: agent });

    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().user).toEqual(agent);
    expect(useAuthStore.getState().hydrated).toBe(true);
  });
});
