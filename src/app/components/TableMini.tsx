import React from 'react';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { Card } from './Card';
import { GameState } from '../../engine';
import { toCardProps, toCardPropsList } from '../utils/engineAdapters';

export interface TableMiniProps {
  gameState: GameState;
  tableIndex: number;
}

export function TableMini({ gameState, tableIndex }: TableMiniProps) {
  const player1 = gameState.players[0];
  const player2 = gameState.players[1];

  const dimClass = gameState.gameOver
    ? 'opacity-50 border-cyan-800 shadow-none'
    : 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]';

  return (
    <div className={`bg-black border-2 p-3 relative overflow-hidden ${dimClass}`}>
      <div className="absolute left-1/2 -translate-x-1/2 top-2 text-xs uppercase tracking-widest text-cyan-400">
        Hand #{gameState.handNumber}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-4">
        <PotDisplay amount={gameState.pot} />
      </div>
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-cyan-400 mb-2">
        <span>Table {tableIndex + 1}</span>
        <span>{gameState.street}</span>
      </div>
      <div className="flex flex-col gap-2 pb-10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-cyan-300">
            <span>{player2.name}</span>
            {player2.isButton && <span className="text-yellow-400">D</span>}
          </div>
          <span className="text-green-400 font-mono">${player2.stack}</span>
        </div>
        <div className="flex gap-1">
          {player2.cards.map((card, idx) => (
            <Card key={idx} {...toCardProps(card)} className="scale-75 origin-top-left" />
          ))}
        </div>
        <div className="relative h-24">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 scale-75 origin-top">
            <CommunityCards cards={toCardPropsList(gameState.communityCards)} />
          </div>
        </div>
        <div className="flex gap-1">
          {player1.cards.map((card, idx) => (
            <Card key={idx} {...toCardProps(card)} className="scale-75 origin-top-left" />
          ))}
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-cyan-300">
            <span>{player1.name}</span>
            {player1.isButton && <span className="text-yellow-400">D</span>}
          </div>
          <span className="text-green-400 font-mono">${player1.stack}</span>
        </div>
      </div>
    </div>
  );
}
