import React, { useState, useEffect } from 'react';
import { useStateStore } from '@json-render/react';

export const DatePicker = ({ element }: any) => {
  let store: any;
  try { store = useStateStore(); } catch { store = null; }

  const { id, label, name, storePath, disabled } = element?.props || {};

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

  return (
    <div className="grid gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium leading-none text-foreground">
          {label}
        </label>
      )}
      <input
        type="date"
        id={id}
        name={name || id}
        value={localValue}
        onChange={handleChange}
        disabled={!!disabled}
        className={
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ' +
          'text-sm text-foreground ring-offset-background cursor-pointer ' +
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
          'disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:dark]'
        }
      />
    </div>
  );
};
