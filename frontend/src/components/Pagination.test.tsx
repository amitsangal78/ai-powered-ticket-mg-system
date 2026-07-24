import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders nothing when total is 0', () => {
    const { container } = render(
      <Pagination page={1} pageSize={10} total={0} onPageChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('disables Previous on first page and Next on last page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination
        page={1}
        pageSize={5}
        total={12}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText('Showing 1–5 of 12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(
      <Pagination
        page={3}
        pageSize={5}
        total={12}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByText('Showing 11–12 of 12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
