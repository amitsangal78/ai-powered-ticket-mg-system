import { useOptimistic, useState, useTransition, type JSX } from 'react';
import type { TicketStatus } from '../schemas/domain';
import { TRANSITIONS } from '../lib/transitions';
import { useTicketStore } from '../stores/ticketStore';
import { StatusBadge } from './StatusBadge';

type Props = {
  ticketId: string;
  status: TicketStatus;
};

export function StatusButtons({ ticketId, status }: Props): JSX.Element {
  const changeStatus = useTicketStore((s) => s.changeStatus);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nextStatuses = TRANSITIONS[optimisticStatus];

  function handleTransition(next: TicketStatus): void {
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(next);
      const result = await changeStatus(ticketId, next);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  if (nextStatuses.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge status={optimisticStatus} />
        <span className="text-sm text-gray-600">No further transitions</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={optimisticStatus} />
        {nextStatuses.map((next) => (
          <button
            key={next}
            type="button"
            disabled={isPending}
            onClick={() => handleTransition(next)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Move to {next}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
