import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TicketDetailPage } from './TicketDetailPage';
import { useTicketStore } from '../stores/ticketStore';
import { useUserStore } from '../stores/userStore';
import type { TicketDetail } from '../api/client';

const detail: TicketDetail = {
  id: '22222222-2222-2222-2222-222222222222',
  title: 'VPN timeout',
  description: 'Cannot connect remotely',
  priority: 'high',
  status: 'Open',
  assignedTo: null,
  createdBy: '11111111-1111-1111-1111-111111111111',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  comments: [
    {
      id: '33333333-3333-3333-3333-333333333333',
      ticketId: '22222222-2222-2222-2222-222222222222',
      message: 'Looking into VPN',
      createdBy: '11111111-1111-1111-1111-111111111111',
      createdAt: '2024-01-01T01:00:00.000Z',
    },
  ],
};

describe('TicketDetailPage', () => {
  beforeEach(() => {
    useUserStore.setState({
      users: [],
      loading: false,
      error: null,
      fetchUsers: vi.fn().mockResolvedValue(undefined),
    });
    useTicketStore.setState({
      tickets: [],
      selected: null,
      loading: false,
      detailLoading: false,
      error: null,
      fetchTicket: vi.fn().mockResolvedValue(undefined),
      clearSelected: vi.fn(),
      updateTicket: vi.fn(),
      changeStatus: vi.fn(),
      addComment: vi.fn(),
    });
  });

  function renderDetail(id = detail.id): void {
    render(
      <MemoryRouter initialEntries={[`/tickets/${id}`]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/tickets" element={<div>Tickets list</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('shows loading skeleton while detailLoading', () => {
    useTicketStore.setState({ detailLoading: true, selected: null });
    renderDetail();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading ticket…')).toBeInTheDocument();
  });

  it('shows error alert when store has error', () => {
    useTicketStore.setState({
      detailLoading: false,
      error: 'Failed to load ticket',
      selected: null,
    });
    renderDetail();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load ticket');
    expect(screen.getByRole('link', { name: 'Back to tickets' })).toBeInTheDocument();
  });

  it('shows not found when selected is null without error message override', () => {
    useTicketStore.setState({
      detailLoading: false,
      error: null,
      selected: null,
    });
    renderDetail();
    expect(screen.getByRole('alert')).toHaveTextContent('Ticket not found');
  });

  it('renders ticket detail, comments, and status controls', () => {
    useTicketStore.setState({
      detailLoading: false,
      selected: detail,
      error: null,
    });
    renderDetail();
    expect(screen.getByRole('heading', { name: 'VPN timeout' })).toBeInTheDocument();
    expect(screen.getAllByText('Cannot connect remotely').length).toBeGreaterThan(0);
    expect(screen.getByText('Looking into VPN')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Move to In Progress' }),
    ).toBeInTheDocument();
  });

  it('shows update failure from store action', async () => {
    const user = userEvent.setup();
    const updateTicket = vi.fn().mockResolvedValue(null);
    useTicketStore.setState({
      detailLoading: false,
      selected: detail,
      error: null,
      updateTicket,
    });
    renderDetail();

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Updated VPN');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to update ticket',
      );
    });
  });
});
