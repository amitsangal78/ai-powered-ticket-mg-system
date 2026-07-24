import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
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

function renderProtected(): void {
  render(
    <MemoryRouter initialEntries={['/tickets']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/tickets" element={<div>Tickets secret</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      hydrated: false,
      error: null,
    });
  });

  it('shows loading state before hydration', () => {
    renderProtected();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Tickets secret')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', () => {
    useAuthStore.setState({ hydrated: true, user: null, token: null });
    renderProtected();
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Tickets secret')).not.toBeInTheDocument();
  });

  it('renders outlet when authenticated', () => {
    useAuthStore.setState({
      hydrated: true,
      user: agent,
      token: 'jwt',
    });
    renderProtected();
    expect(screen.getByText('Tickets secret')).toBeInTheDocument();
  });
});
