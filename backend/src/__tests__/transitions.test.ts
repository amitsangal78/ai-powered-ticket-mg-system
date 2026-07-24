import { describe, expect, it } from 'vitest';
import {
  TRANSITIONS,
  VALID_STATUSES,
  type TicketStatus,
} from '../schemas/domain.js';
import { isValidTransition } from '../services/ticketStatusService.js';

/** Wave 6.4.6 — pure TRANSITIONS helper table tests */
describe('TRANSITIONS pure map (Wave 6.4)', () => {
  it('documents exact Core edges from spec §4.2', () => {
    expect(TRANSITIONS.Open).toEqual(['In Progress', 'Cancelled']);
    expect(TRANSITIONS['In Progress']).toEqual(['Resolved', 'Cancelled']);
    expect(TRANSITIONS.Resolved).toEqual(['Closed']);
    expect(TRANSITIONS.Closed).toEqual([]);
    expect(TRANSITIONS.Cancelled).toEqual([]);
  });

  it('isValidTransition matches TRANSITIONS for every status pair', () => {
    for (const from of VALID_STATUSES) {
      for (const to of VALID_STATUSES) {
        const expected = (
          TRANSITIONS[from] as readonly TicketStatus[]
        ).includes(to);
        expect(isValidTransition(from, to)).toBe(expected);
      }
    }
  });

  it('terminal statuses have no outgoing edges', () => {
    expect(TRANSITIONS.Closed).toHaveLength(0);
    expect(TRANSITIONS.Cancelled).toHaveLength(0);
    for (const to of VALID_STATUSES) {
      expect(isValidTransition('Closed', to)).toBe(false);
      expect(isValidTransition('Cancelled', to)).toBe(false);
    }
  });
});
