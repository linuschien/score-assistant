import type { ComponentType } from 'react';

export const ChartPlaceholder = (type: string): ComponentType<any> =>
  ({ element }: any) => (
    <div className="border border-slate-800 p-4 rounded bg-slate-950 text-slate-400">
      {type} Chart: {element?.props?.label}
    </div>
  );
