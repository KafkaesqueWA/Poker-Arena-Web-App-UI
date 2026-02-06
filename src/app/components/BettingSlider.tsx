import React, { useState } from 'react';
import { ActionButton } from './ActionButton';

export interface BettingSliderProps {
  min: number;
  max: number;
  currentBet: number;
  potSize: number;
  bigBlind: number;
  onBet: (amount: number) => void;
  onCancel: () => void;
}

export function BettingSlider({ min, max, currentBet, potSize, bigBlind, onBet, onCancel }: BettingSliderProps) {
  // Calculate raise amounts instead of total bet amounts
  const minRaiseRaw = min - currentBet;
  const maxRaiseRaw = max - currentBet;
  
  // Round to nearest big blind increment
  const minRaise = Math.ceil(minRaiseRaw / bigBlind) * bigBlind;
  const maxRaise = Math.floor(maxRaiseRaw / bigBlind) * bigBlind;
  
  const [raiseAmount, setRaiseAmount] = useState(minRaise);

  const presetBets = [
    { label: '1/3 Pot', value: Math.floor(potSize / 3) },
    { label: '1/2 Pot', value: Math.floor(potSize / 2) },
    { label: 'Pot', value: potSize },
    { label: 'All-In', value: maxRaise }
  ];

  // Helper to round preset values to big blind increments
  const roundToBigBlind = (value: number) => {
    return Math.floor(value / bigBlind) * bigBlind;
  };

  return (
    <div className="bg-black p-6 border-2 border-magenta-500 shadow-[0_0_20px_rgba(217,70,239,0.5)]">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-magenta-400 uppercase tracking-wide">Raise Amount</span>
          <span className="text-green-400 text-xl font-bold font-mono">${raiseAmount.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={minRaise}
          max={maxRaise}
          step={bigBlind}
          value={raiseAmount}
          onChange={(e) => setRaiseAmount(Number(e.target.value))}
          className="w-full h-2 bg-charcoal-600 appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-magenta-500 mt-1">
          <span>${minRaise.toLocaleString()}</span>
          <span>${maxRaise.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {presetBets.map((preset) => {
          const roundedValue = roundToBigBlind(preset.value);
          const clampedValue = Math.min(Math.max(roundedValue, minRaise), maxRaise);
          return (
            <button
              key={preset.label}
              onClick={() => setRaiseAmount(clampedValue)}
              className="px-3 py-2 bg-charcoal-900 hover:bg-charcoal-800 text-magenta-400 text-sm border-2 border-magenta-600 transition-colors"
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <ActionButton variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </ActionButton>
        <ActionButton variant="primary" onClick={() => onBet(currentBet + raiseAmount)} className="flex-1">
          Confirm Bet
        </ActionButton>
      </div>
    </div>
  );
}