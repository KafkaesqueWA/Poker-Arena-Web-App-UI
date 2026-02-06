import React from 'react';

export interface PotDisplayProps {
  amount: number;
  className?: string;
}

export function PotDisplay({ amount, className = '' }: PotDisplayProps) {
  return (
    <div className={`bg-black px-3 py-1.5 border-2 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.35)] ${className}`}>
      <div className="text-yellow-300 text-[10px] mb-0.5 uppercase tracking-widest text-center">Pot</div>
      <div className="text-yellow-400 text-base font-bold font-mono text-center">${amount.toLocaleString()}</div>
    </div>
  );
}