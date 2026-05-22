import React from 'react';
import type { ComponentType } from 'react';

export const CustomButton: ComponentType<any> = ({ props, children, emit, loading }: any) => {
  const { id, label, variant, disabled, className } = props || {};

  // Standard interactive button classes
  let btnClasses = 'inline-flex items-center justify-center font-medium rounded-lg text-sm px-4 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:pointer-events-none ';
  
  if (variant === 'link') {
    btnClasses += 'text-slate-400 hover:text-slate-200 transition-colors duration-200 font-medium cursor-pointer bg-transparent border-none p-0 h-auto shadow-none text-sm ';
  } else if (variant === 'secondary') {
    btnClasses += 'bg-secondary text-slate-200 border border-slate-800/80 ';
  } else if (variant === 'destructive' || variant === 'danger') {
    btnClasses += 'bg-danger text-white shadow-lg ';
  } else if (variant === 'outline') {
    btnClasses += 'border border-slate-800 bg-transparent text-slate-200 hover:bg-slate-900/30 ';
  } else {
    // default/primary
    btnClasses += 'bg-primary text-white shadow-lg ';
  }

  if (className) {
    btnClasses += `${className} `;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (emit) {
      emit('press');
    }
  };

  return (
    <button
      id={id}
      type="button"
      disabled={disabled || loading}
      onClick={handleClick}
      className={btnClasses.trim()}
      data-variant={variant}
    >
      {label || children}
    </button>
  );
};
