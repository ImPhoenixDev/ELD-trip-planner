import { useEffect, useId, useRef, useState } from "react";
import { suggestPlaces } from "../lib/api";

const DEBOUNCE_MS = 250;

export default function AddressAutocomplete({ label, value, onChange, placeholder, error }) {
  const id = useId();
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);

  const boxRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  // When we set the input from a chosen suggestion, skip the next fetch.
  const skipFetchRef = useRef(false);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const runQuery = (text) => {
    clearTimeout(debounceRef.current);
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
        /* aborted or network error — ignore */
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const handleInput = (e) => {
    const text = e.target.value;
    onChange(text);
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    runQuery(text);
  };

  const choose = (s) => {
    skipFetchRef.current = true;
    onChange(s.label);
    setOpen(false);
    setSuggestions([]);
    setActive(-1);
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (active >= 0) {
        e.preventDefault();
        choose(suggestions[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="field-input"
          placeholder={placeholder}
          value={value}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
        />
        {loading && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.label}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm ${
                i === active ? "bg-brand-50 text-brand-800" : "text-slate-700"
              }`}
            >
              <span className="mt-0.5 text-slate-400">📍</span>
              <span className="leading-snug">{s.label}</span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
