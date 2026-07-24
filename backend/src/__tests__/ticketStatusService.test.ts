import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TRANSITIONS,
  VALID_STATUSES,
  type Ticket,
  type TicketStatus,
} from '../schemas/domain.js';
import { AppError } from '../middleware/errors.js';
import type { TicketRow } from '../repositories/ticketRepository.js';

vi.mock('../repositories/ticketRepository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../repositories/ticketRepository.js')
  >('../repositories/ticketRepository.js');
  return {
    ...actual,
    withTransaction: vi.fn(
      async <T>(fn: (client: unknown) => Promise<T>): Promise<T> => fn({}),
    ),
    lockTicketRow: vi.fn(),
    applyTicketStatus: vi.fn(),
  };
});

import {
  applyTicketStatus,
  lockTicketRow,
} from '../repositories/ticketRepository.js';
import {
  isValidTransition,
  transition,
} from '../services/ticketStatusService.js';

const ticketId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const now = new Date('2024-06-01T00:00:00.000Z');

function row(status: TicketStatus): TicketRow {
  return {
    id: ticketId,
    title: 'T',
    description: 'D',
    priority: 'medium',
    status,
    assigned_to: null,
    created_by: '11111111-1111-4111-8111-111111111111',
    created_at: now,
    updated_at: now,
  };
}

function ticket(status: TicketStatus): Ticket {
  return {
    id: ticketId,
    title: 'T',
    description: 'D',
    priority: 'medium',
    status,
    assignedTo: null,
    createdBy: '11111111-1111-4111-8111-111111111111',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

describe('TicketStatusService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidTransition / TRANSITIONS matrix', () => {
    it('allows only the documented edges', () => {
      for (const from of VALID_STATUSES) {
        for (const to of VALID_STATUSES) {
          const expected = (TRANSITIONS[from] as readonly TicketStatus[]).includes(
            to,
          );
          expect(isValidTransition(from, to)).toBe(expected);
        }
      }
    });
  });

  describe('transition', () => {
    it('applies a valid Open → In Progress transition', async () => {
      vi.mocked(lockTicketRow).mockResolvedValue(row('Open'));
      vi.mocked(applyTicketStatus).mockResolvedValue(ticket('In Progress'));

      const result = await transition(ticketId, 'In Progress');
      expect(result.status).toBe('In Progress');
      expect(applyTicketStatus).toHaveBeenCalled();
    });

    it('returns 409 INVALID_TRANSITION and does not apply status on illegal edge', async () => {
      vi.mocked(lockTicketRow).mockResolvedValue(row('Open'));

      await expect(transition(ticketId, 'Resolved')).rejects.toMatchObject({
        statusCode: 409,
        code: 'INVALID_TRANSITION',
      } satisfies Partial<AppError>);

      expect(applyTicketStatus).not.toHaveBeenCalled();
    });

    it('returns 404 when ticket is missing', async () => {
      vi.mocked(lockTicketRow).mockResolvedValue(null);

      await expect(transition(ticketId, 'In Progress')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(applyTicketStatus).not.toHaveBeenCalled();
    });

    it('rejects all transitions from Closed and Cancelled', async () => {
      for (const terminal of ['Closed', 'Cancelled'] as const) {
        for (const to of VALID_STATUSES) {
          vi.mocked(lockTicketRow).mockResolvedValue(row(terminal));
          vi.mocked(applyTicketStatus).mockClear();

          await expect(transition(ticketId, to)).rejects.toMatchObject({
            code: 'INVALID_TRANSITION',
          });
          expect(applyTicketStatus).not.toHaveBeenCalled();
        }
      }
    });
  });
});
