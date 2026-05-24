import React, { useState, useEffect, useRef } from 'react';
import { useStateStore } from '@json-render/react';

export const DatePicker = ({ element }: any) => {
  let store: any;
  try { store = useStateStore(); } catch { store = null; }

  const { id, label, name, storePath, disabled, placeholder } = element?.props || {};

  const inputRef = useRef<HTMLInputElement>(null);

  // Local state mirrors the store — provides immediate controlled re-render
  const [localValue, setLocalValue] = useState<string>(() =>
    (storePath && store ? (store.get(storePath) as string) : '') ?? ''
  );

  const storeVal = (storePath && store ? (store.get(storePath) as string) : '') ?? '';
  useEffect(() => {
    setLocalValue(storeVal);
  }, [storeVal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // always YYYY-MM-DD from native date picker
    setLocalValue(val);
    if (storePath && store) store.set(storePath, val);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLocalValue('');
    if (storePath && store) store.set(storePath, '');
  };

  const handleTriggerPicker = () => {
    if (disabled) return;
    try {
      inputRef.current?.showPicker();
    } catch (err) {
      console.warn('showPicker failed, falling back to focus/click:', err);
      inputRef.current?.focus();
      inputRef.current?.click();
    }
  };

  return (
    <div className="grid gap-1.5 text-left w-full">
      {label && (
        <label htmlFor={id} className="text-sm font-medium leading-none text-foreground">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {/* Visual styled wrapper matching shadcn/ui input */}
        <div
          onClick={handleTriggerPicker}
          className={
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ' +
            'text-sm items-center justify-between transition-colors cursor-pointer ' +
            (disabled
              ? 'bg-muted/50 text-muted-foreground opacity-50 cursor-not-allowed pointer-events-none'
              : 'text-foreground hover:border-accent-foreground/30')
          }
        >
          <span className={localValue ? 'text-foreground' : 'text-muted-foreground'}>
            {localValue || placeholder || 'YYYY-MM-DD'}
          </span>
          <div className="flex items-center space-x-1.5 z-10">
            {localValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground pointer-events-none"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
          </div>
        </div>

        {/* Hidden but fully interactive native date picker in background */}
        <input
          ref={inputRef}
          type="date"
          id={id}
          name={name || id}
          value={localValue}
          onChange={handleChange}
          disabled={!!disabled}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
          style={{ colorScheme: 'dark' }}
        />
      </div>
    </div>
  );
};
