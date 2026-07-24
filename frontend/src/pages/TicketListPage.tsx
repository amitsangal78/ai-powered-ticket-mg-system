import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { VALID_STATUSES, type TicketStatus } from '../schemas/domain';
import { useTicketStore } from '../stores/ticketStore';
import { useFilterStore } from '../stores/filterStore';
import { useUiStore } from '../stores/uiStore';
import { RouteErrorBoundary } from '../components/ErrorBoundary';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { CreateTicketForm } from '../components/CreateTicketForm';
import { Pagination } from '../components/Pagination';
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_CHARS,
  useDebouncedTicketSearch,
} from '../hooks/useDebouncedTicketSearch';

function TicketListSkeleton(): JSX.Element {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">Loading tickets…</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="mt-4 h-4 w-2/3 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function TicketListContent(): JSX.Element {
  const tickets = useTicketStore((s) => s.tickets);
  const loading = useTicketStore((s) => s.loading);
  const error = useTicketStore((s) => s.error);
  const fetchTickets = useTicketStore((s) => s.fetchTickets);
  const search = useFilterStore((s) => s.search);
  const status = useFilterStore((s) => s.status);
  const page = useFilterStore((s) => s.page);
  const pageSize = useFilterStore((s) => s.pageSize);
  const setSearch = useFilterStore((s) => s.setSearch);
  const setStatus = useFilterStore((s) => s.setStatus);
  const setPage = useFilterStore((s) => s.setPage);
  const setPageSize = useFilterStore((s) => s.setPageSize);
  const bannerError = useUiStore((s) => s.bannerError);
  const setBannerError = useUiStore((s) => s.setBannerError);
  const [showCreate, setShowCreate] = useState(false);

  const commitSearch = useCallback(
    (activeSearch: string) => {
      setSearch(activeSearch);
    },
    [setSearch],
  );

  const { searchDraft, setSearchDraft, isSearchPending } =
    useDebouncedTicketSearch(search, {
      onCommit: commitSearch,
      debounceMs: SEARCH_DEBOUNCE_MS,
    });

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets, status]);

  /** Title-only match on the loaded list (keyword search UX). */
  const titleMatchedTickets = useMemo(() => {
    if (search.length === 0) {
      return tickets;
    }
    const needle = search.toLowerCase();
    return tickets.filter((t) => t.title.toLowerCase().includes(needle));
  }, [tickets, search]);

  const pagedTickets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return titleMatchedTickets.slice(start, start + pageSize);
  }, [titleMatchedTickets, page, pageSize]);

  const draftTrimmedLength = searchDraft.trim().length;
  const showMinCharsHint =
    draftTrimmedLength > 0 && draftTrimmedLength <= SEARCH_MIN_CHARS;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tickets</h2>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {showCreate ? 'Hide form' : 'New ticket'}
        </button>
      </div>

      {showCreate ? (
        <CreateTicketForm
          onCreated={() => {
            setShowCreate(false);
            void fetchTickets();
          }}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-1">
          <label htmlFor="ticket-search" className="block text-sm font-medium text-gray-800">
            Search title
          </label>
          <input
            id="ticket-search"
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={`Type more than ${SEARCH_MIN_CHARS} characters…`}
            aria-describedby="ticket-search-hint"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p id="ticket-search-hint" className="text-sm text-gray-600">
            {showMinCharsHint
              ? `Enter more than ${SEARCH_MIN_CHARS} characters to search.`
              : isSearchPending
                ? 'Updating search…'
                : search.length > 0
                  ? `Filtering titles for “${search}”.`
                  : `Search starts after more than ${SEARCH_MIN_CHARS} characters (${SEARCH_DEBOUNCE_MS}ms debounce).`}
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor="ticket-status" className="block text-sm font-medium text-gray-800">
            Status
          </label>
          <select
            id="ticket-status"
            value={status ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setStatus(value === '' ? null : (value as TicketStatus));
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            {VALID_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="ticket-page-size" className="block text-sm font-medium text-gray-800">
            Per page
          </label>
          <select
            id="ticket-page-size"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[5, 10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {bannerError ? (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700" role="alert">
            {bannerError}
          </p>
          <button
            type="button"
            onClick={() => setBannerError(null)}
            className="text-sm font-medium text-red-800 underline focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-base text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <TicketListSkeleton /> : null}

      {!loading && !error ? (
        <div className="space-y-4">
          <ul className="space-y-3">
            {pagedTickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="truncate text-lg font-medium text-gray-900">
                      {ticket.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-base text-gray-700">
                    {ticket.description}
                  </p>
                </Link>
              </li>
            ))}
            {titleMatchedTickets.length === 0 ? (
              <li className="rounded-lg border border-gray-200 bg-white p-6 text-base text-gray-700 shadow-sm">
                No tickets match your filters.
              </li>
            ) : null}
          </ul>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={titleMatchedTickets.length}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </section>
  );
}

export function TicketListPage(): JSX.Element {
  return (
    <RouteErrorBoundary fallbackTitle="Tickets failed to load">
      <TicketListContent />
    </RouteErrorBoundary>
  );
}
