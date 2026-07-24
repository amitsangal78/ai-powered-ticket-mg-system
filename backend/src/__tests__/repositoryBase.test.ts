import { describe, expect, it } from 'vitest';
import { mapPgError, toIsoString } from '../repositories/base.js';

describe('repository base helpers', () => {
  it('maps PostgreSQL unique_violation to 409 CONFLICT', () => {
    const err = mapPgError({ code: '23505' });
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('maps check_violation to 400 VALIDATION_ERROR', () => {
    const err = mapPgError({ code: '23514' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('formats Date values as ISO-8601', () => {
    const d = new Date('2024-01-15T12:00:00.000Z');
    expect(toIsoString(d)).toBe('2024-01-15T12:00:00.000Z');
  });
});
