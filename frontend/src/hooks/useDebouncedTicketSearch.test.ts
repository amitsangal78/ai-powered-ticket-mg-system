import { describe, expect, it } from 'vitest';
import {
  SEARCH_MIN_CHARS,
  toActiveSearchTerm,
} from './useDebouncedTicketSearch';

describe('toActiveSearchTerm', () => {
  it('returns empty when blank or whitespace', () => {
    expect(toActiveSearchTerm('')).toBe('');
    expect(toActiveSearchTerm('   ')).toBe('');
  });

  it('returns empty when length is at most SEARCH_MIN_CHARS', () => {
    expect(toActiveSearchTerm('a')).toBe('');
    expect(toActiveSearchTerm('ab')).toBe('');
    expect(toActiveSearchTerm('abc')).toBe('');
    expect(toActiveSearchTerm(' ab ').trim().length).toBeLessThanOrEqual(
      SEARCH_MIN_CHARS,
    );
    expect(toActiveSearchTerm(' ab ')).toBe('');
  });

  it('returns trimmed term when longer than SEARCH_MIN_CHARS', () => {
    expect(toActiveSearchTerm('abcd')).toBe('abcd');
    expect(toActiveSearchTerm('  login  ')).toBe('login');
    expect(toActiveSearchTerm('VPN timeout')).toBe('VPN timeout');
  });
});
