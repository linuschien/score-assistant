import type { ComponentType } from 'react';


export const AlertDialog: ComponentType<any> = ({ element, children }) => {
  const { label, text } = element?.props || {};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl shadow-2xl max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-white mb-2">{label || text || '確認操作'}</h3>
        <div className="text-sm text-slate-400 mb-6">{children}</div>
      </div>
    </div>
  );
};
