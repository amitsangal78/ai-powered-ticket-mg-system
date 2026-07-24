import { create } from 'zustand';

/** Placeholder stores — full implementations in Wave 5 */

type AuthState = {
  token: string | null;
  hydrated: boolean;
};

export const useAuthStore = create<AuthState>(() => ({
  token: null,
  hydrated: false,
}));

type FilterState = {
  search: string;
  status: string | null;
  setSearch: (search: string) => void;
  setStatus: (status: string | null) => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  search: '',
  status: null,
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
}));
