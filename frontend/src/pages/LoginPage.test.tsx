import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../pages/LoginPage';
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

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      hydrated: true,
      error: null,
      login: vi.fn(),
    });
  });

  it('shows login error via useActionState path', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(false);
    useAuthStore.setState({
      login,
      error: 'Invalid email or password',
      hydrated: true,
      user: null,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Email'), 'agent@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid email or password',
      );
    });
    expect(login).toHaveBeenCalled();
  });

  it('disables submit while pending and surfaces store login error', async () => {
    const user = userEvent.setup();
    let resolveLogin: ((value: boolean) => void) | undefined;
    const login = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveLogin = resolve;
        }),
    );
    useAuthStore.setState({
      login,
      error: null,
      hydrated: true,
      user: null,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Email'), 'agent@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();

    useAuthStore.setState({ error: 'Invalid credentials' });
    resolveLogin?.(false);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid credentials',
      );
    });
    expect(login).toHaveBeenCalledWith('agent@example.com', 'password123');
  });

  it('redirects when already authenticated', () => {
    useAuthStore.setState({
      hydrated: true,
      user: agent,
      token: 'jwt',
    });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });
});
