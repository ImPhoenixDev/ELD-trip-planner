import { useEffect, useRef, useState, useCallback } from 'react';
import { suggestPlaces } from '../../lib/api';
import type { AddressSuggestion } from '../../types/trip';

const DEBOUNCE_MS = 250;

export function useAddressSuggestions(_value: string, onChange: (text: string) => void) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipFetchRef = useRef(false);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const runQuery = (text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    if (text.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const results = await suggestPlaces(text, { signal: controller.signal });
        setSuggestions(results);
        setActive(-1);
        setOpen(results.length > 0);
      } catch {
        /* aborted or network error */
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const handleInput = (text: string) => {
    onChange(text);
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    runQuery(text);
  };

  const choose = (suggestion: AddressSuggestion) => {
    skipFetchRef.current = true;
    onChange(suggestion.label);
    setOpen(false);
    setSuggestions([]);
    setActive(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const close = useCallback(() => setOpen(false), []);
  const openIfHasSuggestions = useCallback(() => {
    if (suggestions.length > 0) setOpen(true);
  }, [suggestions.length]);

  return {
    suggestions,
    open,
    active,
    loading,
    setActive,
    handleInput,
    choose,
    handleKeyDown,
    close,
    openIfHasSuggestions,
  };
}
