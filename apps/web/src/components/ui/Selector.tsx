'use client';
import { useState, useRef, useEffect, useId } from 'react';

export interface SelectorOption {
  value: string;
  label: string;
}

interface Props {
  options: SelectorOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

export default function Selector({ options, value, onChange, placeholder = 'Select...', searchPlaceholder = 'Search...', disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      setFocused(-1);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { setFocused((f) => Math.min(f + 1, filtered.length - 1)); e.preventDefault(); }
    if (e.key === 'ArrowUp') { setFocused((f) => Math.max(f - 1, 0)); e.preventDefault(); }
    if (e.key === 'Enter' && focused >= 0) {
      onChange(filtered[focused].value);
      setOpen(false);
      e.preventDefault();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input flex items-center justify-between text-left cursor-default"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>{selected?.label ?? placeholder}</span>
        <svg className="w-4 h-4 text-gray-400 ml-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              className="input py-1.5 text-sm"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setFocused(-1); }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <ul role="listbox" className="max-h-52 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">No results</li>
            ) : (
              filtered.map((opt, i) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  className={`px-3 py-2 text-sm cursor-pointer ${
                    opt.value === value ? 'bg-brand-50 text-brand-700 font-medium' :
                    i === focused ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onMouseEnter={() => setFocused(i)}
                  onMouseDown={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
