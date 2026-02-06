import React from 'react';

export interface PlayerSeatProps {
  name: string;
  stack: number;
  isDealer?: boolean;
  isActive?: boolean;
  hasFolded?: boolean;
  isWinner?: boolean;
  className?: string;
}

export function PlayerSeat({ 
  name, 
  stack, 
  isDealer, 
  isActive, 
  hasFolded, 
  isWinner, 
  className = '' 
}: PlayerSeatProps) {
  // Determine border and text colors based on folded state
  const getBorderStyle = () => {
    if (hasFolded) {
      return 'border-gray-500 shadow-[0_0_5px_rgba(107,114,128,0.2)]';
    }
    if (isWinner) {
      return 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]';
    }
    if (isActive) {
      return 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]';
    }
    return 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]';
  };

  const getTextOpacity = () => hasFolded ? 'opacity-40' : '';

  return (
    <div className={`relative ${className}`}>
      {/* Player Info Panel */}
      <div className={`bg-black p-3 border-2 ${getBorderStyle()} min-w-[170px] ${getTextOpacity()}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {isDealer && (
              <div className="w-5 h-5 bg-yellow-400 text-black flex items-center justify-center text-[10px] font-bold border border-yellow-300">
                D
              </div>
            )}
            <span className="text-cyan-400 text-sm font-medium uppercase tracking-wide">{name}</span>
          </div>
          {isActive && !hasFolded && (
            <div className="w-2 h-2 bg-green-500 animate-pulse"></div>
          )}
        </div>
        <div className="text-green-400 text-lg font-semibold font-mono">${stack.toLocaleString()}</div>
      </div>
    </div>
  );
}