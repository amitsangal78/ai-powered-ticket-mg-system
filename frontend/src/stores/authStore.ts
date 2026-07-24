import { create } from 'zustand';
import type { User } from '../schemas/domain';
import {
  getStoredToken,
  loginApi,
  meApi,
  setStoredToken,
} from '../api/client';

type AuthState = {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearSession: () => void;
  handleUnauthorized: () => void;
};

function redirectToLogin(): void {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: getStoredToken(),
  hydrated: false,
  error: null,

  clearSession: (): void => {
    setStoredToken(null);
    set({ user: null, token: null, error: null });
  },

  handleUnauthorized: (): void => {
    get().clearSession();
    redirectToLogin();
  },

  logout: (): void => {
    get().clearSession();
    redirectToLogin();
  },

  hydrate: async (): Promise<void> => {
    const token = getStoredToken();
    if (!token) {
      set({ user: null, token: null, hydrated: true });
      return;
    }
    const result = await meApi(token, () => get().clearSession());
    if (!result.ok) {
      set({ user: null, token: null, hydrated: true });
      return;
    }
    set({ user: result.data, token, hydrated: true, error: null });
  },

  login: async (email: string, password: string): Promise<boolean> => {
    const result = await loginApi(email, password);
    if (!result.ok) {
      set({ error: result.error.error });
      return false;
    }
    setStoredToken(result.data.token);
    set({
      user: result.data.user,
      token: result.data.token,
      hydrated: true,
      error: null,
    });
    return true;
  },
}));
