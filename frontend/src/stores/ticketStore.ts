import { create } from 'zustand';
import type { Ticket, TicketStatus, Comment } from '../schemas/domain';
import {
  addCommentApi,
  changeStatusApi,
  createTicketApi,
  fetchTicketApi,
  fetchTicketsApi,
  updateTicketApi,
  type TicketDetail,
} from '../api/client';
import { useAuthStore } from './authStore';
import { useFilterStore } from './filterStore';
import { useUiStore } from './uiStore';

type TicketState = {
  tickets: Ticket[];
  selected: TicketDetail | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  fetchTickets: () => Promise<void>;
  fetchTicket: (id: string) => Promise<void>;
  createTicket: (input: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    assignedTo?: string | null | undefined;
  }) => Promise<Ticket | null>;
  updateTicket: (
    id: string,
    body: {
      title?: string | undefined;
      description?: string | undefined;
      priority?: 'low' | 'medium' | 'high' | undefined;
      assignedTo?: string | null | undefined;
    },
  ) => Promise<Ticket | null>;
  changeStatus: (
    id: string,
    status: TicketStatus,
  ) => Promise<{ ok: true; ticket: Ticket } | { ok: false; code?: string; error: string }>;
  addComment: (id: string, message: string) => Promise<Comment | null>;
  clearSelected: () => void;
};

function onUnauthorized(): void {
  useAuthStore.getState().handleUnauthorized();
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  selected: null,
  loading: false,
  detailLoading: false,
  error: null,

  clearSelected: (): void => set({ selected: null }),

  fetchTickets: async (): Promise<void> => {
    // Keyword title search is handled on the frontend (debounce + min chars).
    // API list is filtered by status only so typing does not spam network calls.
    const { status } = useFilterStore.getState();
    set({ loading: true, error: null });
    const params: {
      search?: string | undefined;
      status?: TicketStatus | null | undefined;
    } = {};
    if (status !== null) {
      params.status = status;
    }
    const result = await fetchTicketsApi(params, onUnauthorized);
    if (!result.ok) {
      set({ loading: false, error: result.error.error });
      useUiStore.getState().setBannerError(result.error.error);
      return;
    }
    set({ loading: false, tickets: result.data, error: null });
  },

  fetchTicket: async (id: string): Promise<void> => {
    set({ detailLoading: true, error: null });
    const result = await fetchTicketApi(id, onUnauthorized);
    if (!result.ok) {
      set({ detailLoading: false, error: result.error.error, selected: null });
      return;
    }
    set({ detailLoading: false, selected: result.data, error: null });
  },

  createTicket: async (input): Promise<Ticket | null> => {
    const result = await createTicketApi(input, onUnauthorized);
    if (!result.ok) {
      useUiStore.getState().setBannerError(result.error.error);
      return null;
    }
    set((state) => ({ tickets: [result.data, ...state.tickets] }));
    return result.data;
  },

  updateTicket: async (id, body): Promise<Ticket | null> => {
    const result = await updateTicketApi(id, body, onUnauthorized);
    if (!result.ok) {
      useUiStore.getState().setBannerError(result.error.error);
      return null;
    }
    set((state) => ({
      tickets: state.tickets.map((t) => (t.id === id ? result.data : t)),
      selected:
        state.selected?.id === id
          ? { ...state.selected, ...result.data }
          : state.selected,
    }));
    return result.data;
  },

  changeStatus: async (id, status) => {
    const result = await changeStatusApi(id, status, onUnauthorized);
    if (!result.ok) {
      return {
        ok: false,
        code: result.error.code,
        error: result.error.error,
      };
    }
    set((state) => ({
      tickets: state.tickets.map((t) => (t.id === id ? result.data : t)),
      selected:
        state.selected?.id === id
          ? { ...state.selected, ...result.data }
          : state.selected,
    }));
    return { ok: true, ticket: result.data };
  },

  addComment: async (id, message): Promise<Comment | null> => {
    const result = await addCommentApi(id, message, onUnauthorized);
    if (!result.ok) {
      useUiStore.getState().setBannerError(result.error.error);
      return null;
    }
    const selected = get().selected;
    if (selected?.id === id) {
      set({
        selected: {
          ...selected,
          comments: [...(selected.comments ?? []), result.data],
        },
      });
    }
    return result.data;
  },
}));
