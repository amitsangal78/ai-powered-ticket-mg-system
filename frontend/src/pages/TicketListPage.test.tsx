import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TicketListPage } from '../pages/TicketListPage';

describe('TicketListPage', () => {
  it('renders scaffold heading', () => {
    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: 'Tickets' }),
    ).toBeInTheDocument();
  });
});
