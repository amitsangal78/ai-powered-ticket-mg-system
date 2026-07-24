import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersPage } from './UsersPage';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import type { User } from '../schemas/domain';

const admin: User = {
  id: '33333333-3333-3333-3333-333333333333',
  name: 'Admin One',
  email: 'admin@example.com',
  role: 'admin',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const agent: User = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Agent One',
  email: 'agent@example.com',
  role: 'agent',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('UsersPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      hydrated: true,
      user: admin,
      token: 'jwt',
      error: null,
    });
    useUserStore.setState({
      users: [admin, agent],
      loading: false,
      error: null,
      fetchUsers: vi.fn().mockResolvedValue(undefined),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn().mockResolvedValue(true),
    });
  });

  it('lists users and opens create form', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByText('Agent One')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New user' }));
    expect(
      screen.getByRole('heading', { name: 'Create user' }),
    ).toBeInTheDocument();
  });

  it('opens edit form for a user', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]!);
    expect(screen.getByRole('heading', { name: /Edit / })).toBeInTheDocument();
  });

  it('disables delete for the current admin account', () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons[0]).toBeDisabled();
    expect(deleteButtons[1]).not.toBeDisabled();
  });

  it('shows loading and empty states', () => {
    useUserStore.setState({
      users: [],
      loading: true,
      error: null,
      fetchUsers: vi.fn().mockResolvedValue(undefined),
    });
    const { rerender } = render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Loading users…')).toBeInTheDocument();

    useUserStore.setState({ loading: false, users: [], error: null });
    rerender(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });

  it('shows store error and failed delete message', async () => {
    const user = userEvent.setup();
    useUserStore.setState({
      users: [admin, agent],
      loading: false,
      error: 'Failed to load users',
      fetchUsers: vi.fn().mockResolvedValue(undefined),
      deleteUser: vi.fn().mockResolvedValue(false),
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load users');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[1]!);
    await waitFor(() => {
      expect(screen.getByText('Failed to delete user.')).toBeInTheDocument();
    });
  });

  it('does not delete when confirm is cancelled', async () => {
    const user = userEvent.setup();
    const deleteUser = vi.fn();
    useUserStore.setState({ deleteUser });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[1]!);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
