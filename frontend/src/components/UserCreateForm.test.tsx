import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserCreateForm } from './UserCreateForm';
import { useUserStore } from '../stores/userStore';

describe('UserCreateForm', () => {
  beforeEach(() => {
    useUserStore.setState({
      users: [],
      loading: false,
      error: null,
      createUser: vi.fn().mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'New Agent',
        email: 'new@example.com',
        role: 'agent',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }),
    });
  });

  it('submits via useActionState and calls createUser', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const createUser = vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'New Agent',
      email: 'new@example.com',
      role: 'agent',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    useUserStore.setState({ createUser });

    render(<UserCreateForm onCreated={onCreated} />);

    await user.type(screen.getByLabelText('Name'), 'New Agent');
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => {
      expect(createUser).toHaveBeenCalledWith({
        name: 'New Agent',
        email: 'new@example.com',
        role: 'agent',
        password: 'password123',
      });
    });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('User created.');
    });
  });
});
