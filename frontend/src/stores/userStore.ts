import { create } from 'zustand';
import type { User } from '../schemas/domain';
import {
  createUserApi,
  deleteUserApi,
  fetchUsersApi,
  updateUserApi,
} from '../api/client';
import { useAuthStore } from './authStore';
import { useUiStore } from './uiStore';

type UserState = {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (input: {
    name: string;
    email: string;
    role: 'agent' | 'admin';
    password: string;
  }) => Promise<User | null>;
  updateUser: (
    id: string,
    body: {
      name?: string | undefined;
      email?: string | undefined;
      role?: 'agent' | 'admin' | undefined;
      password?: string | undefined;
    },
  ) => Promise<User | null>;
  deleteUser: (id: string) => Promise<boolean>;
};

function onUnauthorized(): void {
  useAuthStore.getState().handleUnauthorized();
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async (): Promise<void> => {
    set({ loading: true, error: null });
    const result = await fetchUsersApi(onUnauthorized);
    if (!result.ok) {
      set({ loading: false, error: result.error.error, users: [] });
      return;
    }
    set({ loading: false, users: result.data, error: null });
  },

  createUser: async (input): Promise<User | null> => {
    const result = await createUserApi(input, onUnauthorized);
    if (!result.ok) {
      useUiStore.getState().setBannerError(result.error.error);
      return null;
    }
    set((state) => ({ users: [...state.users, result.data] }));
    return result.data;
  },

  updateUser: async (id, body): Promise<User | null> => {
    const result = await updateUserApi(id, body, onUnauthorized);
    if (!result.ok) {
      useUiStore.getState().setBannerError(result.error.error);
      return null;
    }
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? result.data : u)),
    }));
    const auth = useAuthStore.getState();
    if (auth.user?.id === id) {
      useAuthStore.setState({ user: result.data });
    }
    return result.data;
  },

  deleteUser: async (id: string): Promise<boolean> => {
    const result = await deleteUserApi(id, onUnauthorized);
    if (!result.ok) {
      useUiStore.getState().setBannerError(result.error.error);
      return false;
    }
    set((state) => ({
      users: state.users.filter((u) => u.id !== id),
    }));
    return true;
  },
}));
