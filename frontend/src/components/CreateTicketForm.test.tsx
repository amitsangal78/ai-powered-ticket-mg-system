import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateTicketForm } from './CreateTicketForm';
import { useTicketStore } from '../stores/ticketStore';
import { useUserStore } from '../stores/userStore';

describe('CreateTicketForm', () => {
  beforeEach(() => {
    useUserStore.setState({
      users: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Agent One',
          email: 'agent@example.com',
          role: 'agent',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      loading: false,
      error: null,
      fetchUsers: vi.fn().mockResolvedValue(undefined),
    });
    useTicketStore.setState({
      createTicket: vi.fn(),
    });
  });

  it('loads users into assignee select', async () => {
    const fetchUsers = vi.fn().mockResolvedValue(undefined);
    useUserStore.setState({ fetchUsers });
    render(<CreateTicketForm />);
    expect(fetchUsers).toHaveBeenCalled();
    expect(
      await screen.findByRole('option', { name: /Agent One/ }),
    ).toBeInTheDocument();
  });

  it('shows validation error for HTML in title', async () => {
    const user = userEvent.setup();
    const createTicket = vi.fn();
    useTicketStore.setState({ createTicket });
    render(<CreateTicketForm />);

    await user.type(screen.getByLabelText('Title'), 'Bad <title>');
    await user.type(screen.getByLabelText('Description'), 'Valid description');
    await user.click(screen.getByRole('button', { name: 'Create ticket' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(createTicket).not.toHaveBeenCalled();
  });

  it('surfaces create failure and success callback', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const createTicket = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Printer offline',
        description: 'No paper',
        priority: 'high',
        status: 'Open',
        assignedTo: null,
        createdBy: '11111111-1111-1111-1111-111111111111',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    useTicketStore.setState({ createTicket });

    const { rerender } = render(<CreateTicketForm onCreated={onCreated} />);
    await user.type(screen.getByLabelText('Title'), 'Printer offline');
    await user.type(screen.getByLabelText('Description'), 'No paper left');
    await user.click(screen.getByRole('button', { name: 'Create ticket' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to create ticket',
      );
    });

    rerender(<CreateTicketForm onCreated={onCreated} />);
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Printer offline');
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'No paper left');
    await user.click(screen.getByRole('button', { name: 'Create ticket' }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(
        '22222222-2222-2222-2222-222222222222',
      );
    });
  });
});
