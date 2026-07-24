import {
  TRANSITIONS,
  type Ticket,
  type TicketStatus,
} from '../schemas/domain.js';
import { AppError } from '../middleware/errors.js';
import {
  applyTicketStatus,
  lockTicketRow,
  withTransaction,
} from '../repositories/ticketRepository.js';

export function isValidTransition(
  from: TicketStatus,
  to: TicketStatus,
): boolean {
  return (TRANSITIONS[from] as readonly TicketStatus[]).includes(to);
}

/**
 * Sole authority for mutating ticket status.
 * Runs inside a transaction with SELECT … FOR UPDATE.
 * Callable without an HTTP server.
 */
export async function transition(
  ticketId: string,
  toStatus: TicketStatus,
): Promise<Ticket> {
  return withTransaction(async (client) => {
    const row = await lockTicketRow(client, ticketId);
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
    }

    if (!isValidTransition(row.status, toStatus)) {
      throw new AppError(
        409,
        'INVALID_TRANSITION',
        `Cannot transition from '${row.status}' to '${toStatus}'`,
      );
    }

    return applyTicketStatus(client, ticketId, toStatus);
  });
}

export const TicketStatusService = {
  transition,
  isValidTransition,
} as const;
