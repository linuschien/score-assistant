import React, { useState, useEffect, useContext } from 'react';
import { useStateStore } from '@json-render/react';
import { RowContext } from './data-table';

interface WeightInlineInputProps {
  rowId?: string;
  row?: any;
}

export const WeightInlineInput = ({ rowId: propRowId, row: propRow }: WeightInlineInputProps) => {
  const context = useContext(RowContext);
  const row = propRow ?? context?.row;
  const rowId = propRowId ?? context?.rowId;

  const store = useStateStore();
  const value = row?.weight ?? 0;
  const activeRowId = rowId || row?.id || '';

  const [localVal, setLocalVal] = useState(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalVal(val);
    const parsed = parseFloat(val);
    const newVal = isNaN(parsed) ? 0 : parsed;

    if (store && activeRowId) {
      const currentList = (store.get('/data/listGradeItems') as any[]) || [];
      const updatedList = currentList.map((item: any) => {
        if (item.id === activeRowId) {
          return { ...item, weight: newVal };
        }
        return item;
      });
      store.set('/data/listGradeItems', updatedList);
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
      data-testid={`weight-input-${activeRowId}`}
    />
  );
};
