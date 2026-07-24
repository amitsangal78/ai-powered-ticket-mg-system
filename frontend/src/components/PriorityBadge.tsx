import type { JSX } from 'react';
import type { TicketPriority } from '../schemas/domain';
import { PRIORITY_STYLES } from '../lib/styles';

type Props = {
  priority: TicketPriority;
};

export function PriorityBadge({ priority }: Props): JSX.Element {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-sm font-medium ${PRIORITY_STYLES[priority]}`}
    >
      {priority}
    </span>
  );
}
