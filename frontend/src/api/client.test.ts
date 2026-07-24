import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, getStoredToken, setStoredToken } from './client';

describe('api client', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('persists token in sessionStorage', () => {
    setStoredToken('abc');
    expect(getStoredToken()).toBe('abc');
    setStoredToken(null);
    expect(getStoredToken()).toBeNull();
  });

  it('attaches Bearer token and parses success with Zod', async () => {
    setStoredToken('jwt');
    const schema = {
      safeParse: (data: unknown) => ({ success: true as const, data }),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: '1' }),
      }),
    );

    const result = await apiRequest<{ id: string }>('/api/x', {
      schema: schema as never,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ id: '1' });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/x'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt',
        }),
      }),
    );
  });

  it('maps error body with apiErrorSchema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({ error: 'Bad', code: 'VALIDATION_ERROR' }),
      }),
    );

    const result = await apiRequest('/api/x');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.status).toBe(400);
    }
  });

  it('invokes onUnauthorized on 401', async () => {
    const onUnauthorized = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
      }),
    );

    await apiRequest('/api/x', { onUnauthorized });
    expect(onUnauthorized).toHaveBeenCalled();
  });
});
