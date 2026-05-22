import type { ComponentType } from 'react';

export const Breadcrumb: ComponentType<any> = ({ children }: any) => (
  <nav className="flex text-sm font-medium text-slate-400 py-2" aria-label="Breadcrumb">
    <ol className="inline-flex items-center space-x-1 md:space-x-3">
      {children}
    </ol>
  </nav>
);
