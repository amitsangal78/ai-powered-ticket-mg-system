import { create } from 'zustand';
import type { TicketStatus } from '../schemas/domain';

export const DEFAULT_PAGE_SIZE = 10;

type FilterState = {
  search: string;
  status: TicketStatus | null;
  page: number;
  pageSize: number;
  setSearch: (search: string) => void;
  setStatus: (status: TicketStatus | null) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  reset: () => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  search: '',
  status: null,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  setSearch: (search) =>
    set((state) => (state.search === search ? state : { search, page: 1 })),
  setStatus: (status) => set({ status, page: 1 }),
  setPage: (page) => set({ page: Math.max(1, page) }),
  setPageSize: (pageSize) =>
    set({ pageSize: Math.min(100, Math.max(1, pageSize)), page: 1 }),
  reset: () =>
    set({ search: '', status: null, page: 1, pageSize: DEFAULT_PAGE_SIZE }),
}));
