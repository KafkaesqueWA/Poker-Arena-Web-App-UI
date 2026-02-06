import React from 'react';
import { Trophy, History, Home, RotateCcw } from 'lucide-react';

export interface GameOverModalProps {
  winnerName: string;
  winnerStack: number;
  loserName: string;
  totalHands: number;
  onViewHistory: () => void;
  onReturnToLobby: () => void;
  onReplayMatch: () => void;
  summaryLabel?: string;
  summaryValuePrefix?: string;
  isTie?: boolean;
  opponentLabel?: string;
  showBustedTag?: boolean;
}

export function GameOverModal({
  winnerName,
  winnerStack,
  loserName,
  totalHands,
  onViewHistory,
  onReturnToLobby,
  onReplayMatch,
  summaryLabel = 'Final Stack',
  summaryValuePrefix = '$',
  isTie = false,
  opponentLabel = 'Opponent',
  showBustedTag = true
}: GameOverModalProps) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-black border-2 border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.8)] p-8 max-w-md w-full mx-4">
        {/* Trophy Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-500 p-4 border-2 border-yellow-400">
            <Trophy className="w-12 h-12 text-black" />
          </div>
        </div>
        
        {/* Winner Text */}
        <h2 className="text-3xl font-bold text-center text-green-400 mb-2 uppercase tracking-wider font-mono">
          {isTie ? 'Match Tied' : `${winnerName} Wins!`}
        </h2>
        
        {/* Match Summary */}
        <div className="bg-charcoal-900 border-2 border-cyan-500 p-4 mb-6 space-y-2">
          <div className="flex justify-between text-cyan-400">
            <span className="uppercase tracking-wide">{summaryLabel}:</span>
            <span className="text-green-400 font-semibold font-mono">{summaryValuePrefix}{winnerStack}</span>
          </div>
          <div className="flex justify-between text-cyan-400">
            <span className="uppercase tracking-wide">{opponentLabel}:</span>
            <span className="text-red-500 font-mono">
              {isTie
                ? 'Tie'
                : showBustedTag
                  ? `${loserName} (Busted)`
                  : loserName}
            </span>
          </div>
          <div className="flex justify-between text-cyan-400">
            <span className="uppercase tracking-wide">Total Hands:</span>
            <span className="text-white font-semibold font-mono">{totalHands}</span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onViewHistory}
            className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3 px-4 transition-colors flex items-center justify-center gap-2 border-2 border-green-400 uppercase tracking-wide shadow-[0_0_10px_rgba(34,197,94,0.5)]"
          >
            <History className="w-5 h-5" />
            View Hand History
          </button>
          
          <button
            onClick={onReplayMatch}
            className="w-full bg-charcoal-900 hover:bg-charcoal-800 text-cyan-400 font-semibold py-3 px-4 transition-colors flex items-center justify-center gap-2 border-2 border-cyan-500 uppercase tracking-wide shadow-[0_0_10px_rgba(6,182,212,0.3)]"
          >
            <RotateCcw className="w-5 h-5" />
            Replay Match
          </button>
          
          <button
            onClick={onReturnToLobby}
            className="w-full bg-charcoal-900 hover:bg-charcoal-800 text-cyan-400 font-semibold py-3 px-4 transition-colors flex items-center justify-center gap-2 border-2 border-cyan-500 uppercase tracking-wide shadow-[0_0_10px_rgba(6,182,212,0.3)]"
          >
            <Home className="w-5 h-5" />
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}