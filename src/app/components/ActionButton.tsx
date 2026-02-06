import React from 'react';

export interface ActionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
}

export function ActionButton({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'secondary',
  className = '' 
}: ActionButtonProps) {
  const baseClasses = 'px-6 py-3 font-semibold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed border-2';
  
  const variantClasses = {
    primary: 'bg-green-900/30 hover:bg-green-900/40 text-green-400 border-green-500 disabled:hover:bg-green-900/30 shadow-[0_0_10px_rgba(34,197,94,0.5)]',
    secondary: 'bg-charcoal-900 hover:bg-charcoal-800 text-cyan-400 border-cyan-500 disabled:hover:bg-charcoal-900 shadow-[0_0_10px_rgba(6,182,212,0.3)]',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-500 disabled:hover:bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}