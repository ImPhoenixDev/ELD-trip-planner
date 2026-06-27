import { useEffect, useId, useRef } from 'react';
import { useAddressSuggestions } from './useAddressSuggestions';

interface AddressAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export default function AddressAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  error,
}: AddressAutocompleteProps) {
  const id = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const {
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
  } = useAddressSuggestions(value, onChange);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [close]);

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
          onChange={(e) => handleInput(e.target.value)}
          onFocus={openIfHasSuggestions}
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
                i === active ? 'bg-brand-50 text-brand-800' : 'text-slate-700'
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
