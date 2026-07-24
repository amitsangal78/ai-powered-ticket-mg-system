import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTicketStore } from './ticketStore';
import { useFilterStore } from './filterStore';
import * as client from '../api/client';
import type { Ticket } from '../schemas/domain';

const ticket: Ticket = {
  id: '22222222-2222-2222-2222-222222222222',
  title: 'Printer broken',
  description: 'Cannot print',
  priority: 'high',
  status: 'Open',
  assignedTo: null,
  createdBy: '11111111-1111-1111-1111-111111111111',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('ticketStore', () => {
  beforeEach(() => {
    useFilterStore.setState({ search: '', status: null });
    useTicketStore.setState({
      tickets: [],
      selected: null,
      loading: false,
      detailLoading: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  it('fetchTickets loads list from API without keyword search param', async () => {
    useFilterStore.setState({ search: 'printer', status: 'Open' });
    const spy = vi.spyOn(client, 'fetchTicketsApi').mockResolvedValue({
      ok: true,
      data: [ticket],
    });
    await useTicketStore.getState().fetchTickets();
    expect(spy).toHaveBeenCalledWith(
      { status: 'Open' },
      expect.any(Function),
    );
    expect(useTicketStore.getState().tickets).toEqual([ticket]);
    expect(useTicketStore.getState().loading).toBe(false);
  });

  it('changeStatus updates ticket on success', async () => {
    const updated = { ...ticket, status: 'In Progress' as const };
    useTicketStore.setState({ tickets: [ticket] });
    vi.spyOn(client, 'changeStatusApi').mockResolvedValue({
      ok: true,
      data: updated,
    });

    const result = await useTicketStore
      .getState()
      .changeStatus(ticket.id, 'In Progress');
    expect(result.ok).toBe(true);
    expect(useTicketStore.getState().tickets[0]?.status).toBe('In Progress');
  });

  it('changeStatus does not mutate on failure', async () => {
    useTicketStore.setState({ tickets: [ticket] });
    vi.spyOn(client, 'changeStatusApi').mockResolvedValue({
      ok: false,
      status: 409,
      error: { error: 'Invalid status transition', code: 'INVALID_TRANSITION' },
    });

    const result = await useTicketStore
      .getState()
      .changeStatus(ticket.id, 'Closed');
    expect(result.ok).toBe(false);
    expect(useTicketStore.getState().tickets[0]?.status).toBe('Open');
  });
});
