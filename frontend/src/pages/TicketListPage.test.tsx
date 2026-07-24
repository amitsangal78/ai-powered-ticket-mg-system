import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TicketListPage } from './TicketListPage';
import { useTicketStore } from '../stores/ticketStore';
import { useFilterStore, DEFAULT_PAGE_SIZE } from '../stores/filterStore';
import { useUiStore } from '../stores/uiStore';
import { SEARCH_DEBOUNCE_MS } from '../hooks/useDebouncedTicketSearch';
import type { Ticket } from '../schemas/domain';

function makeTicket(i: number, title?: string): Ticket {
  const n = String(i).padStart(12, '0');
  return {
    id: `22222222-2222-2222-2222-${n}`,
    title: title ?? `Ticket ${i}`,
    description: `Description ${i}`,
    priority: 'medium',
    status: 'Open',
    assignedTo: null,
    createdBy: '11111111-1111-1111-1111-111111111111',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('TicketListPage pagination', () => {
  beforeEach(() => {
    useFilterStore.setState({
      search: '',
      status: null,
      page: 1,
      pageSize: 5,
    });
    useUiStore.setState({ bannerError: null });
    const tickets = Array.from({ length: 12 }, (_, i) => makeTicket(i + 1));
    useTicketStore.setState({
      tickets,
      selected: null,
      loading: false,
      detailLoading: false,
      error: null,
      fetchTickets: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('shows only the current page of tickets', async () => {
    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Ticket 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Ticket 5')).toBeInTheDocument();
    expect(screen.queryByText('Ticket 6')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1–5 of 12')).toBeInTheDocument();
  });

  it('moves to next page', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Ticket 6')).toBeInTheDocument();
    expect(screen.queryByText('Ticket 1')).not.toBeInTheDocument();
    expect(useFilterStore.getState().page).toBe(2);
  });

  it('resets page when status filter changes', async () => {
    const user = userEvent.setup();
    useFilterStore.setState({ page: 2, pageSize: DEFAULT_PAGE_SIZE });
    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText('Status'), 'Open');
    expect(useFilterStore.getState().page).toBe(1);
  });
});

describe('TicketListPage title search', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useFilterStore.setState({
      search: '',
      status: null,
      page: 1,
      pageSize: 10,
    });
    useUiStore.setState({ bannerError: null });
    useTicketStore.setState({
      tickets: [
        makeTicket(1, 'VPN timeout issue'),
        makeTicket(2, 'Printer offline'),
        makeTicket(3, 'Email bounce rates'),
      ],
      selected: null,
      loading: false,
      detailLoading: false,
      error: null,
      fetchTickets: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not apply search for 3 or fewer characters after debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Search title'), 'vpn');
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(useFilterStore.getState().search).toBe('');
    expect(screen.getByText('VPN timeout issue')).toBeInTheDocument();
    expect(screen.getByText('Printer offline')).toBeInTheDocument();
  });

  it('applies title filter after more than 3 characters and 500ms debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchTickets = vi.fn().mockResolvedValue(undefined);
    useTicketStore.setState({ fetchTickets });

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    const callsBeforeType = fetchTickets.mock.calls.length;
    await user.type(screen.getByLabelText('Search title'), 'print');
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(useFilterStore.getState().search).toBe('print');
    expect(screen.getByText('Printer offline')).toBeInTheDocument();
    expect(screen.queryByText('VPN timeout issue')).not.toBeInTheDocument();
    // Title search must not trigger extra list fetches
    expect(fetchTickets.mock.calls.length).toBe(callsBeforeType);
  });

  it('debounces rapid typing into a single commit', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const setSearchSpy = vi.fn();
    const original = useFilterStore.getState().setSearch;
    useFilterStore.setState({
      setSearch: (value: string) => {
        setSearchSpy(value);
        original(value);
      },
    });

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText('Search title');
    await user.type(input, 'prin');
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    await user.type(input, 'ter');
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(setSearchSpy).toHaveBeenCalled();
    expect(setSearchSpy.mock.calls.at(-1)?.[0]).toBe('printer');
    expect(useFilterStore.getState().search).toBe('printer');
  });
});

describe('TicketListPage conditional UI', () => {
  beforeEach(() => {
    useFilterStore.setState({
      search: '',
      status: null,
      page: 1,
      pageSize: 10,
    });
    useUiStore.setState({ bannerError: null });
    useTicketStore.setState({
      tickets: [makeTicket(1, 'VPN timeout')],
      selected: null,
      loading: false,
      detailLoading: false,
      error: null,
      fetchTickets: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('shows loading skeleton and hides list', () => {
    useTicketStore.setState({ loading: true, tickets: [] });
    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Loading tickets…')).toBeInTheDocument();
    expect(screen.queryByText('VPN timeout')).not.toBeInTheDocument();
  });

  it('shows store error alert', () => {
    useTicketStore.setState({
      error: 'Failed to load',
      loading: false,
      tickets: [],
    });
    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load');
  });

  it('shows empty filter message', () => {
    useTicketStore.setState({ tickets: [], loading: false, error: null });
    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText('No tickets match your filters.'),
    ).toBeInTheDocument();
  });

  it('dismisses bannerError', async () => {
    const user = userEvent.setup();
    useUiStore.setState({ bannerError: 'Something broke' });
    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Something broke')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(useUiStore.getState().bannerError).toBeNull();
  });
});
