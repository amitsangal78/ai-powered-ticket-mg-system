import { useEffect, useState } from 'react';

/** Debounce delay before committing search to the filter store / API. */
export const SEARCH_DEBOUNCE_MS = 500;

/**
 * Minimum characters required before a keyword search is applied.
 * Search starts only after typing *more than* this many characters.
 */
export const SEARCH_MIN_CHARS = 3;

/**
 * Maps a draft input to the active API search term.
 * Empty / ≤ SEARCH_MIN_CHARS → no search (empty string).
 */
export function toActiveSearchTerm(draft: string): string {
  const trimmed = draft.trim();
  return trimmed.length > SEARCH_MIN_CHARS ? trimmed : '';
}

type Options = {
  debounceMs?: number;
  onCommit: (activeSearch: string) => void;
};

/**
 * Local draft + debounced commit for ticket title keyword search.
 * Avoids firing the list API on every keystroke; only commits when
 * the trimmed draft is empty or longer than SEARCH_MIN_CHARS.
 */
export function useDebouncedTicketSearch(
  initialSearch: string,
  { onCommit, debounceMs = SEARCH_DEBOUNCE_MS }: Options,
): {
  searchDraft: string;
  setSearchDraft: (value: string) => void;
  isSearchPending: boolean;
} {
  const [searchDraft, setSearchDraft] = useState(initialSearch);
  const [isSearchPending, setIsSearchPending] = useState(false);

  useEffect(() => {
    setIsSearchPending(true);
    const handle = window.setTimeout(() => {
      onCommit(toActiveSearchTerm(searchDraft));
      setIsSearchPending(false);
    }, debounceMs);
    return () => {
      window.clearTimeout(handle);
    };
  }, [searchDraft, onCommit, debounceMs]);

  return { searchDraft, setSearchDraft, isSearchPending };
}
