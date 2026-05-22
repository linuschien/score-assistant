import React, { useState, useEffect } from 'react';

interface WeightInlineInputProps {
  rowId: string;
  value: number;
  onChange: (val: number) => void;
}

export const WeightInlineInput = ({ rowId, value, onChange }: WeightInlineInputProps) => {
  const [localVal, setLocalVal] = useState(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalVal(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else if (val === '') {
      onChange(0);
    }
  };

  return (
    <input
      type="number"
      value={localVal}
      onChange={handleChange}
      className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary [color-scheme:dark]"
      placeholder="0"
      min="0"
      max="100"
      step="any"
      data-testid={`weight-input-${rowId}`}
    />
  );
};
