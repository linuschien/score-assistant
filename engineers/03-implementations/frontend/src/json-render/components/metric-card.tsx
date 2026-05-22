import { useStateValue } from '@json-render/react';
import type { ComponentType } from 'react';

export const MetricCard: ComponentType<any> = ({ element }: any) => {
  const { label, value, dataRef } = element?.props || {};
  let displayValue = value;
  if (dataRef === 'listGradeItems') {
    const list = useStateValue('/data/listGradeItems');
    const total = Array.isArray(list) ? list.reduce((sum: number, item: any) => sum + (Number(item.weight) || 0), 0) : 0;
    displayValue = `${parseFloat(total.toFixed(4))}%`;
  }
  return (
    <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
      <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{label}</div>
      <div className="mt-3 text-3xl font-extrabold text-white tracking-tight">{displayValue ?? '—'}</div>
    </div>
  );
};
