import { z } from 'zod';
import {
  apiErrorSchema,
  type ApiError,
  ticketSchema,
  userSchema,
  commentSchema,
  type Ticket,
  type User,
  type Comment,
  type TicketStatus,
} from '../schemas/domain';

const TOKEN_KEY = 'ticket_mg_jwt';

export type ClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError; status: number };

export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  if (typeof url !== 'string' || url.length === 0) {
    // Allow relative/mocked tests to set VITE_API_URL via vitest env
    return 'http://localhost:3000';
  }
  return url.replace(/\/$/, '');
}

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token === null) {
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    // ignore quota / private mode
  }
}

type RequestOptions = {
  method?: string | undefined;
  body?: unknown | undefined;
  token?: string | null | undefined;
  schema?: z.ZodTypeAny | undefined;
  onUnauthorized?: (() => void) | undefined;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ClientResult<T>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = options.token ?? getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers,
    };
    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }
    response = await fetch(`${getApiBaseUrl()}${path}`, init);
  } catch {
    return {
      ok: false,
      status: 0,
      error: { error: 'Network error', code: 'NETWORK_ERROR' },
    };
  }

  const text = await response.text();
  let json: unknown = undefined;
  if (text.length > 0) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      return {
        ok: false,
        status: response.status,
        error: { error: 'Invalid JSON response', code: 'PARSE_ERROR' },
      };
    }
  }

  if (response.status === 401) {
    options.onUnauthorized?.();
    const parsedErr = apiErrorSchema.safeParse(json);
    return {
      ok: false,
      status: 401,
      error: parsedErr.success
        ? parsedErr.data
        : { error: 'Unauthorized', code: 'UNAUTHORIZED' },
    };
  }

  if (!response.ok) {
    const parsedErr = apiErrorSchema.safeParse(json);
    return {
      ok: false,
      status: response.status,
      error: parsedErr.success
        ? parsedErr.data
        : {
            error: 'Request failed',
            code: 'REQUEST_FAILED',
            details: json,
          },
    };
  }

  // 204 No Content (e.g. DELETE)
  if (response.status === 204 || text.length === 0) {
    return { ok: true, data: null as T };
  }

  if (options.schema) {
    const parsed = options.schema.safeParse(json);
    if (!parsed.success) {
      return {
        ok: false,
        status: response.status,
        error: {
          error: 'Response validation failed',
          code: 'PARSE_ERROR',
          details: parsed.error.flatten(),
        },
      };
    }
    return { ok: true, data: parsed.data as T };
  }

  return { ok: true, data: json as T };
}

const ticketDetailSchema = ticketSchema.extend({
  comments: z.array(commentSchema).default([]),
});
export type TicketDetail = z.infer<typeof ticketDetailSchema>;

const loginResponseSchema = z.object({
  token: z.string().min(1),
  user: userSchema,
});

export async function loginApi(
  email: string,
  password: string,
  onUnauthorized?: () => void,
): Promise<ClientResult<{ token: string; user: User }>> {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    token: null,
    schema: loginResponseSchema,
    onUnauthorized,
  });
}

export async function meApi(
  token: string,
  onUnauthorized?: () => void,
): Promise<ClientResult<User>> {
  return apiRequest('/api/auth/me', {
    token,
    schema: userSchema,
    onUnauthorized,
  });
}

export async function fetchTicketsApi(
  params: {
    search?: string | undefined;
    status?: TicketStatus | null | undefined;
  },
  onUnauthorized?: () => void,
): Promise<ClientResult<Ticket[]>> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  const q = qs.toString();
  return apiRequest(`/api/tickets${q ? `?${q}` : ''}`, {
    schema: z.array(ticketSchema),
    onUnauthorized,
  });
}

export async function fetchTicketApi(
  id: string,
  onUnauthorized?: () => void,
): Promise<ClientResult<TicketDetail>> {
  return apiRequest(`/api/tickets/${id}`, {
    schema: ticketDetailSchema,
    onUnauthorized,
  });
}

export async function createTicketApi(
  body: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    assignedTo?: string | null | undefined;
  },
  onUnauthorized?: () => void,
): Promise<ClientResult<Ticket>> {
  return apiRequest('/api/tickets', {
    method: 'POST',
    body,
    schema: ticketSchema,
    onUnauthorized,
  });
}

export async function updateTicketApi(
  id: string,
  body: {
    title?: string | undefined;
    description?: string | undefined;
    priority?: 'low' | 'medium' | 'high' | undefined;
    assignedTo?: string | null | undefined;
  },
  onUnauthorized?: () => void,
): Promise<ClientResult<Ticket>> {
  return apiRequest(`/api/tickets/${id}`, {
    method: 'PATCH',
    body,
    schema: ticketSchema,
    onUnauthorized,
  });
}

export async function changeStatusApi(
  id: string,
  status: TicketStatus,
  onUnauthorized?: () => void,
): Promise<ClientResult<Ticket>> {
  return apiRequest(`/api/tickets/${id}/status`, {
    method: 'PATCH',
    body: { status },
    schema: ticketSchema,
    onUnauthorized,
  });
}

export async function addCommentApi(
  id: string,
  message: string,
  onUnauthorized?: () => void,
): Promise<ClientResult<Comment>> {
  return apiRequest(`/api/tickets/${id}/comments`, {
    method: 'POST',
    body: { message },
    schema: commentSchema,
    onUnauthorized,
  });
}

export async function fetchUsersApi(
  onUnauthorized?: () => void,
): Promise<ClientResult<User[]>> {
  return apiRequest('/api/users', {
    schema: z.array(userSchema),
    onUnauthorized,
  });
}

export async function createUserApi(
  body: {
    name: string;
    email: string;
    role: 'agent' | 'admin';
    password: string;
  },
  onUnauthorized?: () => void,
): Promise<ClientResult<User>> {
  return apiRequest('/api/users', {
    method: 'POST',
    body,
    schema: userSchema,
    onUnauthorized,
  });
}

export async function updateUserApi(
  id: string,
  body: {
    name?: string | undefined;
    email?: string | undefined;
    role?: 'agent' | 'admin' | undefined;
    password?: string | undefined;
  },
  onUnauthorized?: () => void,
): Promise<ClientResult<User>> {
  return apiRequest(`/api/users/${id}`, {
    method: 'PATCH',
    body,
    schema: userSchema,
    onUnauthorized,
  });
}

export async function deleteUserApi(
  id: string,
  onUnauthorized?: () => void,
): Promise<ClientResult<null>> {
  return apiRequest(`/api/users/${id}`, {
    method: 'DELETE',
    onUnauthorized,
  });
}
