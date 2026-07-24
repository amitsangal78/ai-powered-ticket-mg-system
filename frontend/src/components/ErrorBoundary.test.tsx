import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary, RouteErrorBoundary } from './ErrorBoundary';

function Boom(): JSX.Element {
  throw new Error('Boom exploded');
}

describe('ErrorBoundary', () => {
  it('renders alert fallback when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Page error' })).toBeInTheDocument();
    expect(screen.getByText('Boom exploded')).toBeInTheDocument();
  });

  it('uses custom fallbackTitle via RouteErrorBoundary', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <RouteErrorBoundary fallbackTitle="Tickets failed to load">
        <Boom />
      </RouteErrorBoundary>,
    );
    expect(
      screen.getByRole('heading', { name: 'Tickets failed to load' }),
    ).toBeInTheDocument();
  });

  it('Try again recovers and re-renders children', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    let shouldThrow = true;
    function Flaky(): JSX.Element {
      if (shouldThrow) throw new Error('temp');
      return <p>Recovered</p>;
    }

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByText('temp')).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });
});
