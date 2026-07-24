import type { JSX } from 'react';

export function TicketListPage(): JSX.Element {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Tickets</h2>
      <p className="text-base text-gray-700">
        Ticket list, search, and filters will load via Zustand stores in Wave 5.
      </p>
      <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-1/3 rounded bg-gray-200" />
        <div className="mt-4 h-4 w-2/3 rounded bg-gray-200" />
      </div>
    </section>
  );
}
