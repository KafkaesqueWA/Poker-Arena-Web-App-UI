import React from 'react';

export interface PotDisplayProps {
  amount: number;
  className?: string;
}

export function PotDisplay({ amount, className = '' }: PotDisplayProps) {
  return (
    <div className={`bg-black px-6 py-3 border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] ${className}`}>
      <div className="text-yellow-300 text-sm mb-1 uppercase tracking-widest text-center">Pot</div>
      <div className="text-yellow-400 text-2xl font-bold font-mono text-center">${amount.toLocaleString()}</div>
    </div>
  );
}