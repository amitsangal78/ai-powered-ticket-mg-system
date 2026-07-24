import type { JSX } from 'react';
import type { TicketStatus } from '../schemas/domain';
import { STATUS_STYLES } from '../lib/styles';

type Props = {
  status: TicketStatus;
};

export function StatusBadge({ status }: Props): JSX.Element {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-sm font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
