import React, { useState, useRef } from 'react';
import { LobbyScreen, GameSettings } from './components/LobbyScreen';
import { MultiTableScreen } from './components/MultiTableScreen';
import { PokerTableScreen } from './components/PokerTableScreen';
import { HandHistoryScreen } from './components/HandHistoryScreen';
import { DevScreen } from './components/DevScreen';
import {
  HandHistoryManager,
  createHandHistoryManager,
  addActionToCurrentHand,
  GameState,
  initializeGame,
  startNewHand,
  createSeededRng,
  Rng,
  formatCard
} from '../engine';

type Screen = 'lobby' | 'game' | 'history' | 'dev';

export default function App() {
  const rngsRef = useRef<Rng[]>([]);
  const [matchId, setMatchId] = useState(0);
  const [currentScreen, setCurrentScreen] = useState<Screen>('lobby');
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    playerName: 'Player 1',
    player2Name: 'Player 2',
    player1Type: 'ai',
    player2Type: 'ai',
    player1BotId: 'warren',
    player2BotId: 'warren',
    startingStack: 1000,
    smallBlind: 5,
    bigBlind: 10,
    tablesCount: 1,
    speedMs: 300
  });
  const [tables, setTables] = useState<
    { gameState: GameState; history: HandHistoryManager }[]
  >([]);

  const handleStartMatch = (settings: GameSettings) => {
    if (
      settings.tablesCount > 1 &&
      (settings.player1Type === 'human' ||
        settings.player2Type === 'human')
    ) {
      return;
    }
    setGameSettings(settings);
    const tablesCount = settings.tablesCount || 1;
    rngsRef.current = Array.from(
      { length: tablesCount },
      (_, idx) => createSeededRng(Date.now() + idx),
    );
    
    const newTables = Array.from({ length: tablesCount }, (_, idx) => {
      const tableSettings: GameSettings = {
        ...settings,
      };
      const initialState = initializeGame(tableSettings);
      let history: HandHistoryManager = {
        hands: [],
        currentHandActions: [],
        currentHandStartStacks: [
          initialState.players[0].stack,
          initialState.players[1].stack
        ]
      };
      const newGameState = startNewHand(
        initialState,
        rngsRef.current[idx],
      );
      history = addActionToCurrentHand(
        history,
        `Hand #${newGameState.handNumber} started`,
      );
      const buttonPlayer = newGameState.players[0].isButton
        ? newGameState.players[0]
        : newGameState.players[1];
      const bbPlayer = newGameState.players[0].isButton
        ? newGameState.players[1]
        : newGameState.players[0];
      history = addActionToCurrentHand(
        history,
        `${buttonPlayer.name} posts small blind $${newGameState.smallBlind}`,
      );
      history = addActionToCurrentHand(
        history,
        `${bbPlayer.name} posts big blind $${newGameState.bigBlind}`,
      );
      history = addActionToCurrentHand(
        history,
        `${newGameState.players[0].name} dealt: ${newGameState.players[0].cards.map(formatCard).join(' ')}`,
      );
      history = addActionToCurrentHand(
        history,
        `${newGameState.players[1].name} dealt: ${newGameState.players[1].cards.map(formatCard).join(' ')}`,
      );
      return { gameState: newGameState, history };
    });
    setTables(newTables);
    setMatchId((prev) => prev + 1);
    
    setCurrentScreen('game');
  };

  const handleExitGame = () => {
    setCurrentScreen('lobby');
    setTables([]); // Clear tables when exiting
  };

  const handleViewHistory = () => {
    setCurrentScreen('history');
  };

  const handleOpenDev = () => {
    setCurrentScreen('dev');
  };

  const handleReplayMatch = () => {
    handleStartMatch(gameSettings);
  };

  const handleBackToGame = () => {
    setCurrentScreen('game');
  };

  return (
    <>
      {currentScreen === 'lobby' && (
        <LobbyScreen onStartMatch={handleStartMatch} onOpenDev={handleOpenDev} />
      )}
      {currentScreen === 'game' && (
        gameSettings.tablesCount === 1 ? (
          <PokerTableScreen
            settings={gameSettings}
            rng={rngsRef.current[0]}
            onExit={handleExitGame}
            onViewHistory={handleViewHistory}
            handHistory={tables[0]?.history ?? createHandHistoryManager()}
            onUpdateHistory={(history) =>
              setTables((prev) => {
                if (!prev[0]) return prev;
                const next = [...prev];
                next[0] = { ...next[0], history };
                return next;
              })
            }
            gameState={tables[0]?.gameState ?? null}
            onUpdateGameState={(state) =>
              setTables((prev) => {
                if (!prev[0]) return prev;
                const next = [...prev];
                next[0] = { ...next[0], gameState: state };
                return next;
              })
            }
          />
        ) : (
          <MultiTableScreen 
            key={matchId}
            settings={gameSettings} 
            rngs={rngsRef.current}
            tables={tables}
            onUpdateTables={setTables}
            onExit={handleExitGame}
            onViewHistory={handleViewHistory}
            onReplayMatch={handleReplayMatch}
          />
        )
      )}
      {currentScreen === 'history' && (
        <HandHistoryScreen 
          onBack={handleBackToGame} 
          handHistories={tables.map((table) => table.history)}
          tableResults={tables.map((table) => ({
            isOver: Boolean(table.gameState.gameOver),
            winnerName:
              table.gameState.gameOver && table.gameState.winner !== undefined
                ? table.gameState.players[table.gameState.winner].name
                : undefined,
          }))}
          playerName={gameSettings.playerName}
        />
      )}
      {currentScreen === 'dev' && (
        <DevScreen onBack={() => setCurrentScreen('lobby')} />
      )}
    </>
  );
}