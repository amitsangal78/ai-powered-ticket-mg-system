import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../schemas/domain';

const agent: User = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Agent One',
  email: 'agent@example.com',
  role: 'agent',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const admin: User = {
  ...agent,
  id: '33333333-3333-3333-3333-333333333333',
  name: 'Admin One',
  email: 'admin@example.com',
  role: 'admin',
};

describe('Navbar', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      hydrated: false,
      error: null,
    });
  });

  it('hides Users link for agents after hydration', () => {
    useAuthStore.setState({ hydrated: true, user: agent, token: 'jwt' });
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByText('Agent One')).toBeInTheDocument();
    expect(screen.getByText(/agent@example.com · agent/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tickets' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  });

  it('shows Users link for admins only', () => {
    useAuthStore.setState({ hydrated: true, user: admin, token: 'jwt' });
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute(
      'href',
      '/users',
    );
  });

  it('calls logout when Log out is clicked', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    useAuthStore.setState({
      hydrated: true,
      user: agent,
      token: 'jwt',
      logout,
    });
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalled();
  });
});
