import React, { useEffect } from 'react';
import { Settings, ArrowLeft } from 'lucide-react';
import { GameSettings } from './LobbyScreen';
import { TableMini } from './TableMini';
import { GameOverModal } from './GameOverModal';
import {
  GameState,
  HandHistoryManager,
  Rng,
  applyAction,
  awardPot,
  determineWinner,
  formatCard,
  getValidActions,
  startNewHand,
  getBotById,
  warrenBot
} from '../../engine';
import { addActionToCurrentHand, completeHandRecord } from '../../engine';

export interface MultiTableScreenProps {
  settings: GameSettings;
  rngs: Rng[];
  tables: { gameState: GameState; history: HandHistoryManager }[];
  onUpdateTables: React.Dispatch<
    React.SetStateAction<
      { gameState: GameState; history: HandHistoryManager }[]
    >
  >;
  onExit: () => void;
  onViewHistory: () => void;
  onReplayMatch: () => void;
}

export function MultiTableScreen({
  settings,
  rngs,
  tables,
  onUpdateTables,
  onExit,
  onViewHistory,
  onReplayMatch
}: MultiTableScreenProps) {
  useEffect(() => {
    if (!tables.length) return;
    let rafId: number | null = null;
    let isActive = true;
    const tick = () => {
      onUpdateTables((prevTables) =>
        prevTables.map((table, idx) =>
          advanceTable(table, rngs[idx], settings),
        ),
      );
    };
    if (settings.speedMs <= 0) {
      const loop = () => {
        if (!isActive) return;
        tick();
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
      return () => {
        isActive = false;
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    }
    const interval = setInterval(tick, settings.speedMs);

    return () => clearInterval(interval);
  }, [tables.length, rngs, onUpdateTables, settings.speedMs]);

  const allTablesComplete =
    tables.length > 0 &&
    tables.every((table) => table.gameState.gameOver);
  const winCounts = tables.reduce(
    (acc, table) => {
      if (table.gameState.winner === 0) acc.player1 += 1;
      if (table.gameState.winner === 1) acc.player2 += 1;
      return acc;
    },
    { player1: 0, player2: 0 },
  );
  const activeTables = tables.filter(
    (table) => !table.gameState.gameOver,
  ).length;
  const overallWinner =
    winCounts.player1 === winCounts.player2
      ? null
      : winCounts.player1 > winCounts.player2
        ? 0
        : 1;
  const opponentWins =
    overallWinner === 0 ? winCounts.player2 : winCounts.player1;
  const playerNames = tables.length
    ? tables[0].gameState.players.map((player) => player.name)
    : ["Player 1", "Player 2"];

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {allTablesComplete && tables.length > 0 && overallWinner !== null && (
        <GameOverModal
          winnerName={
            playerNames[overallWinner]
          }
          winnerStack={
            winCounts.player1 > winCounts.player2
              ? winCounts.player1
              : winCounts.player2
          }
          loserName={`${opponentWins}`}
          totalHands={tables.reduce(
            (total, table) => total + table.history.hands.length,
            0,
          )}
          summaryLabel="Games Won"
          summaryValuePrefix=""
          opponentLabel="Opponent Wins"
          showBustedTag={false}
          onViewHistory={onViewHistory}
          onReturnToLobby={onExit}
          onReplayMatch={onReplayMatch}
        />
      )}
      {allTablesComplete && tables.length > 0 && overallWinner === null && (
        <GameOverModal
          winnerName="Tie"
          winnerStack={winCounts.player1}
          loserName={`${winCounts.player2}`}
          totalHands={tables.reduce(
            (total, table) => total + table.history.hands.length,
            0,
          )}
          summaryLabel="Games Won"
          summaryValuePrefix=""
          opponentLabel="Opponent Wins"
          showBustedTag={false}
          isTie
          onViewHistory={onViewHistory}
          onReturnToLobby={onExit}
          onReplayMatch={onReplayMatch}
        />
      )}
      {/* Top Bar */}
      <div className="bg-black border-b-2 border-cyan-500 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={onExit}
            className="flex items-center gap-2 text-cyan-400 hover:text-green-400 transition-colors uppercase tracking-wide"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Exit</span>
          </button>

          <div className="flex flex-col items-center">
            <div className="text-cyan-400 uppercase tracking-widest">
              Multi-Table Simulation
            </div>
            {tables.length > 0 && (
              <div className="text-cyan-400 uppercase tracking-widest text-xs mt-1">
                {playerNames[0]}: <span className="text-green-400">{winCounts.player1}</span> • {playerNames[1]}: <span className="text-green-400">{winCounts.player2}</span> • Active: <span className="text-green-400">{activeTables}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onViewHistory()}
              className="text-cyan-400 hover:text-green-400 transition-colors uppercase tracking-wide"
            >
              Hand History
            </button>
            <button className="text-cyan-400 hover:text-green-400 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="flex-1 p-6">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          {tables.map((table, idx) => (
            <TableMini
              key={`table-${idx}`}
              gameState={table.gameState}
              tableIndex={idx}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function advanceTable(
  table: { gameState: GameState; history: HandHistoryManager },
  rng: Rng,
  settings: GameSettings,
): { gameState: GameState; history: HandHistoryManager } {
  let { gameState, history } = table;

  if (gameState.gameOver) {
    return table;
  }

  if (gameState.isHandComplete) {
    const folded = gameState.players.find((player) => player.folded);
    if (folded) {
      const winnerIndex = gameState.players.findIndex(
        (player) => !player.folded,
      );
      const potAmount = gameState.pot;
      const nextState = awardPot(gameState, winnerIndex);
      const completedHistory = completeHandRecord(
        history,
        nextState,
        potAmount,
        winnerIndex,
      );
      if (nextState.gameOver) {
        return { gameState: nextState, history: completedHistory };
      }
      return startNextHand(nextState, completedHistory, rng);
    }

    if (gameState.street === 'Showdown') {
      const { winner, p1Hand, p2Hand } = determineWinner(gameState);
      let updatedHistory = addActionToCurrentHand(
        history,
        `--- Showdown ---`,
      );
      updatedHistory = addActionToCurrentHand(
        updatedHistory,
        `${gameState.players[0].name}: ${p1Hand.description}`,
      );
      updatedHistory = addActionToCurrentHand(
        updatedHistory,
        `${gameState.players[1].name}: ${p2Hand.description}`,
      );
      if (winner === null) {
        updatedHistory = addActionToCurrentHand(
          updatedHistory,
          'Pot split!',
        );
      } else {
        updatedHistory = addActionToCurrentHand(
          updatedHistory,
          `${gameState.players[winner].name} wins the pot ($${gameState.pot})`,
        );
      }

      const potAmount = gameState.pot;
      const nextState = awardPot(gameState, winner);
      const completedHistory = completeHandRecord(
        updatedHistory,
        nextState,
        potAmount,
        winner,
        p1Hand,
        p2Hand,
      );

      if (nextState.gameOver) {
        return { gameState: nextState, history: completedHistory };
      }

      return startNextHand(nextState, completedHistory, rng);
    }
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const prevStreet = gameState.street;
  const botId =
    gameState.currentPlayerIndex === 0
      ? settings.player1BotId
      : settings.player2BotId;
  const bot = getBotById(botId) ?? warrenBot;
  const aiAction = bot.decide(
    gameState,
    gameState.currentPlayerIndex,
    rng,
  );

  let updatedHistory = history;

  if (aiAction.type === 'fold') {
    updatedHistory = addActionToCurrentHand(
      updatedHistory,
      `${currentPlayer.name} folds`,
    );
  } else if (aiAction.type === 'check') {
    updatedHistory = addActionToCurrentHand(
      updatedHistory,
      `${currentPlayer.name} checks`,
    );
  } else if (aiAction.type === 'call') {
    const validActions = getValidActions(gameState);
    const actualCallAmount = Math.min(
      validActions.callAmount,
      currentPlayer.stack,
    );
    updatedHistory = addActionToCurrentHand(
      updatedHistory,
      `${currentPlayer.name} calls $${actualCallAmount}`,
    );
  } else if (aiAction.type === 'raise') {
    updatedHistory = addActionToCurrentHand(
      updatedHistory,
      `${currentPlayer.name} raises to $${aiAction.amount}`,
    );
  }

  const { state: newState } = applyAction(gameState, aiAction, rng);

  updatedHistory = logAllInRunout(prevStreet, newState, updatedHistory);
  updatedHistory = logStreetChange(
    prevStreet,
    newState,
    updatedHistory,
  );

  return { gameState: newState, history: updatedHistory };
}

function logStreetChange(
  prevStreet: string,
  newState: GameState,
  history: HandHistoryManager,
): HandHistoryManager {
  if (newState.street === prevStreet || newState.street === 'Showdown') {
    return history;
  }

  let nextHistory = history;
  if (newState.street === 'Flop' && newState.communityCards.length === 3) {
    const flopCards = newState.communityCards.slice(0, 3);
    nextHistory = addActionToCurrentHand(
      nextHistory,
      `--- Flop: ${flopCards.map(formatCard).join(' ')} ---`,
    );
  } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
    const turnCard = newState.communityCards[3];
    nextHistory = addActionToCurrentHand(
      nextHistory,
      `--- Turn: ${formatCard(turnCard)} ---`,
    );
  } else if (newState.street === 'River' && newState.communityCards.length === 5) {
    const riverCard = newState.communityCards[4];
    nextHistory = addActionToCurrentHand(
      nextHistory,
      `--- River: ${formatCard(riverCard)} ---`,
    );
  }

  return nextHistory;
}

function logAllInRunout(
  prevStreet: string,
  newState: GameState,
  history: HandHistoryManager,
): HandHistoryManager {
  if (
    newState.street !== 'Showdown' ||
    prevStreet === 'River' ||
    newState.communityCards.length !== 5
  ) {
    return history;
  }

  let nextHistory = addActionToCurrentHand(
    history,
    `--- All-in, dealing remaining cards ---`,
  );

  if (prevStreet === 'Preflop') {
    const flopCards = newState.communityCards.slice(0, 3);
    nextHistory = addActionToCurrentHand(
      nextHistory,
      `--- Flop: ${flopCards.map(formatCard).join(' ')} ---`,
    );
    const turnCard = newState.communityCards[3];
    nextHistory = addActionToCurrentHand(
      nextHistory,
      `--- Turn: ${formatCard(turnCard)} ---`,
    );
    const riverCard = newState.communityCards[4];
    nextHistory = addActionToCurrentHand(
      nextHistory,
      `--- River: ${formatCard(riverCard)} ---`,
    );
  } else if (prevStreet === 'Flop') {
    const turnCard = newState.communityCards[3];
    nextHistory = addActionToCurrentHand(
      nextHistory,
      `--- Turn: ${formatCard(turnCard)} ---`,
    );
    const riverCard = newState.communityCards[4];
    nextHistory = addActionToCurrentHand(
      nextHistory,
      `--- River: ${formatCard(riverCard)} ---`,
    );
  } else if (prevStreet === 'Turn') {
    const riverCard = newState.communityCards[4];
    nextHistory = addActionToCurrentHand(
      nextHistory,
      `--- River: ${formatCard(riverCard)} ---`,
    );
  }

  return nextHistory;
}

function startNextHand(
  state: GameState,
  history: HandHistoryManager,
  rng: Rng,
): { gameState: GameState; history: HandHistoryManager } {
  const stacksBeforeNewHand: [number, number] = [
    state.players[0].stack,
    state.players[1].stack,
  ];
  const nextState = startNewHand(state, rng);
  let nextHistory: HandHistoryManager = {
    ...history,
    currentHandActions: [],
    currentHandStartStacks: stacksBeforeNewHand,
  };

  nextHistory = addActionToCurrentHand(
    nextHistory,
    `Hand #${nextState.handNumber} started`,
  );
  const buttonPlayer = nextState.players[0].isButton
    ? nextState.players[0]
    : nextState.players[1];
  const bbPlayer = nextState.players[0].isButton
    ? nextState.players[1]
    : nextState.players[0];
  nextHistory = addActionToCurrentHand(
    nextHistory,
    `${buttonPlayer.name} posts small blind $${nextState.smallBlind}`,
  );
  nextHistory = addActionToCurrentHand(
    nextHistory,
    `${bbPlayer.name} posts big blind $${nextState.bigBlind}`,
  );
  nextHistory = addActionToCurrentHand(
    nextHistory,
    `${nextState.players[0].name} dealt: ${nextState.players[0].cards.map(formatCard).join(' ')}`,
  );
  nextHistory = addActionToCurrentHand(
    nextHistory,
    `${nextState.players[1].name} dealt: ${nextState.players[1].cards.map(formatCard).join(' ')}`,
  );

  return { gameState: nextState, history: nextHistory };
}
