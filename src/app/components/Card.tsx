import React from 'react';

export interface CardProps {
  suit?: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank?: string;
  faceDown?: boolean;
  className?: string;
}

export function Card({ suit, rank, faceDown = false, className = '' }: CardProps) {
  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  const getSuitColor = (suit?: string) => {
    switch (suit) {
      case 'hearts': return '#ef4444'; // neon red
      case 'diamonds': return '#06b6d4'; // neon blue/cyan
      case 'clubs': return '#22c55e'; // neon green
      case 'spades': return '#ffffff'; // white
      default: return '#ffffff';
    }
  };

  if (faceDown) {
    return (
      <div className={`w-14 h-20 bg-gradient-to-br from-blue-900 to-blue-950 border-2 border-cyan-500 flex items-center justify-center shadow-md ${className}`}>
        <div className="w-8 h-12 border-2 border-cyan-400/50"></div>
      </div>
    );
  }

  const suitColor = getSuitColor(suit);

  return (
    <div className={`w-14 h-20 bg-black border-2 p-1.5 shadow-md flex flex-col ${className}`} style={{ borderColor: suitColor }}>
      <div className="text-lg font-bold leading-none" style={{ color: suitColor }}>
        {rank}
      </div>
      <div className="text-2xl leading-none mt-0.5" style={{ color: suitColor }}>
        {getSuitSymbol(suit || '')}
      </div>
    </div>
  );
}