import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdminRoute } from './AdminRoute';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../schemas/domain';

const agent: User = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Agent',
  email: 'agent@example.com',
  role: 'agent',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const admin: User = {
  ...agent,
  id: '33333333-3333-3333-3333-333333333333',
  role: 'admin',
  email: 'admin@example.com',
  name: 'Admin',
};

function renderAdmin(): void {
  render(
    <MemoryRouter initialEntries={['/users']}>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/tickets" element={<div>Tickets</div>} />
        <Route element={<AdminRoute />}>
          <Route path="/users" element={<div>Admin users</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      hydrated: false,
      error: null,
    });
  });

  it('redirects agents to /tickets', () => {
    useAuthStore.setState({ hydrated: true, user: agent, token: 'jwt' });
    renderAdmin();
    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.queryByText('Admin users')).not.toBeInTheDocument();
  });

  it('allows admins', () => {
    useAuthStore.setState({ hydrated: true, user: admin, token: 'jwt' });
    renderAdmin();
    expect(screen.getByText('Admin users')).toBeInTheDocument();
  });
});
