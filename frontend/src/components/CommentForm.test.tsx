import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentForm } from './CommentForm';
import { useTicketStore } from '../stores/ticketStore';
import { useAuthStore } from '../stores/authStore';
import type { Comment } from '../schemas/domain';

const ticketId = '22222222-2222-2222-2222-222222222222';
const userId = '11111111-1111-1111-1111-111111111111';

const existing: Comment = {
  id: '33333333-3333-3333-3333-333333333333',
  ticketId,
  message: 'Existing note',
  createdBy: userId,
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('CommentForm', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: userId,
        name: 'Agent',
        email: 'agent@example.com',
        role: 'agent',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      token: 'jwt',
      hydrated: true,
      error: null,
    });
    useTicketStore.setState({
      addComment: vi.fn().mockResolvedValue({
        id: '44444444-4444-4444-4444-444444444444',
        ticketId,
        message: 'New note',
        createdBy: userId,
        createdAt: '2024-01-02T00:00:00.000Z',
      }),
    });
  });

  it('shows empty state when there are no comments', () => {
    render(<CommentForm ticketId={ticketId} comments={[]} />);
    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('renders existing comments', () => {
    render(<CommentForm ticketId={ticketId} comments={[existing]} />);
    expect(screen.getByText('Existing note')).toBeInTheDocument();
  });

  it('rejects HTML-like messages with validation alert', async () => {
    const user = userEvent.setup();
    const addComment = vi.fn();
    useTicketStore.setState({ addComment });
    render(<CommentForm ticketId={ticketId} comments={[]} />);

    await user.type(screen.getByLabelText('Add a comment'), 'Hello <b>x</b>');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(addComment).not.toHaveBeenCalled();
  });

  it('shows failure when addComment returns null', async () => {
    const user = userEvent.setup();
    useTicketStore.setState({
      addComment: vi.fn().mockResolvedValue(null),
    });
    render(<CommentForm ticketId={ticketId} comments={[]} />);

    await user.type(screen.getByLabelText('Add a comment'), 'Still investigating');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to add comment',
      );
    });
  });

  it('posts a valid comment through the store', async () => {
    const user = userEvent.setup();
    const addComment = vi.fn().mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      ticketId,
      message: 'Still investigating',
      createdBy: userId,
      createdAt: '2024-01-02T00:00:00.000Z',
    });
    useTicketStore.setState({ addComment });
    render(<CommentForm ticketId={ticketId} comments={[]} />);

    await user.type(screen.getByLabelText('Add a comment'), 'Still investigating');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    await waitFor(() => {
      expect(addComment).toHaveBeenCalledWith(ticketId, 'Still investigating');
    });
  });
});
