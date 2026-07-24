import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusButtons } from './StatusButtons';
import { useTicketStore } from '../stores/ticketStore';

describe('StatusButtons', () => {
  beforeEach(() => {
    useTicketStore.setState({
      tickets: [],
      selected: null,
      loading: false,
      detailLoading: false,
      error: null,
    });
  });

  it('renders only valid next transitions for Open', () => {
    render(
      <StatusButtons
        ticketId="22222222-2222-2222-2222-222222222222"
        status="Open"
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Move to In Progress' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Move to Cancelled' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Move to Closed' }),
    ).not.toBeInTheDocument();
  });

  it('renders no transition buttons for Closed', () => {
    render(
      <StatusButtons
        ticketId="22222222-2222-2222-2222-222222222222"
        status="Closed"
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('No further transitions')).toBeInTheDocument();
  });

  it('renders no transition buttons for Cancelled', () => {
    render(
      <StatusButtons
        ticketId="22222222-2222-2222-2222-222222222222"
        status="Cancelled"
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('No further transitions')).toBeInTheDocument();
  });

  it('renders In Progress next statuses', () => {
    render(
      <StatusButtons
        ticketId="22222222-2222-2222-2222-222222222222"
        status="In Progress"
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Move to Resolved' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Move to Cancelled' }),
    ).toBeInTheDocument();
  });

  it('shows inline error on non-409 failure', async () => {
    const user = userEvent.setup();
    useTicketStore.setState({
      changeStatus: vi.fn().mockResolvedValue({
        ok: false,
        code: 'INTERNAL_ERROR',
        error: 'Server unavailable',
      }),
    });
    render(
      <StatusButtons
        ticketId="22222222-2222-2222-2222-222222222222"
        status="Open"
      />,
    );
    await user.click(
      screen.getByRole('button', { name: 'Move to In Progress' }),
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server unavailable');
    });
  });
});
