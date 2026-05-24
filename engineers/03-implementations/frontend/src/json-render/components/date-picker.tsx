import React, { useState, useEffect } from 'react';
import { useStateStore } from '@json-render/react';

export const DatePicker = ({ element }: any) => {
  let store: any;
  try { store = useStateStore(); } catch { store = null; }

  const { id, label, name, storePath, disabled, placeholder } = element?.props || {};

  // Local state mirrors the store — provides immediate controlled re-render
  const [localValue, setLocalValue] = useState<string>(() =>
    (storePath && store ? (store.get(storePath) as string) : '') ?? ''
  );

  const storeVal = (storePath && store ? (store.get(storePath) as string) : '') ?? '';
  useEffect(() => {
    setLocalValue(storeVal);
  }, [storeVal]);

  // Use text input type when empty & unfocused to show custom placeholder, and date type when focused or filled
  const [inputType, setInputType] = useState<'text' | 'date'>(localValue ? 'date' : 'text');

  useEffect(() => {
    if (localValue) {
      setInputType('date');
    } else {
      setInputType('text');
    }
  }, [localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // always YYYY-MM-DD from native date picker
    setLocalValue(val);
    if (storePath && store) store.set(storePath, val);
  };

  return (
    <div className="grid gap-1.5 text-left">
      {label && (
        <label htmlFor={id} className="text-sm font-medium leading-none text-foreground">
          {label}
        </label>
      )}
      <input
        type={inputType}
        id={id}
        name={name || id}
        value={localValue}
        placeholder={placeholder || 'YYYY-MM-DD'}
        onChange={handleChange}
        onFocus={() => setInputType('date')}
        onBlur={(e) => {
          if (!e.target.value) {
            setInputType('text');
          }
        }}
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
