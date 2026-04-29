'use client';
import { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface Props {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export default function Dropdown({ trigger, items, align = 'right' }: Props) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!open) setFocused(-1);
  }, [open]);

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      setOpen(true);
      setFocused(0);
      e.preventDefault();
    }
  }

  function handleMenuKeyDown(e: React.KeyboardEvent) {
    const active = items.filter((i) => !i.disabled);
    if (e.key === 'Escape') { setOpen(false); e.preventDefault(); return; }
    if (e.key === 'ArrowDown') { setFocused((f) => Math.min(f + 1, active.length - 1)); e.preventDefault(); }
    if (e.key === 'ArrowUp') { setFocused((f) => Math.max(f - 1, 0)); e.preventDefault(); }
    if (e.key === 'Enter' && focused >= 0) {
      active[focused].onClick();
      setOpen(false);
      e.preventDefault();
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        className="outline-none"
      >
        {trigger}
      </div>

      {open && (
        <div
          role="menu"
          onKeyDown={handleMenuKeyDown}
          className={`absolute z-50 mt-1 min-w-[10rem] bg-white border border-gray-200 rounded-md shadow-lg py-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item, i) => {
            const enabledIdx = items.filter((x) => !x.disabled).indexOf(item);
            return (
              <button
                key={i}
                role="menuitem"
                disabled={item.disabled}
                tabIndex={-1}
                className={`w-full text-left px-4 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                  item.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : enabledIdx === focused
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onMouseEnter={() => setFocused(enabledIdx)}
                onClick={() => { item.onClick(); setOpen(false); }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
