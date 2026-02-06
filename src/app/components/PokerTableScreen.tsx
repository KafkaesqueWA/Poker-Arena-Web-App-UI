import React, { useState, useEffect, useRef } from 'react';
import { Settings, ArrowLeft } from 'lucide-react';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { ActionButton } from './ActionButton';
import { BettingSlider } from './BettingSlider';
import { ActionLog, ActionLogEntry } from './ActionLog';
import { Card } from './Card';
import { GameSettings } from './LobbyScreen';
import { GameOverModal } from './GameOverModal';
import {
  GameState,
  initializeGame,
  startNewHand,
  getValidActions,
  determineWinner,
  awardPot,
  Street,
  applyAction,
  createSeededRng,
  getAdvancedAIAction,
  Rng,
  formatCard
} from '../../engine';
import {
  HandHistoryManager,
  addActionToCurrentHand,
  completeHandRecord
} from '../../engine';
import { toCardProps, toCardPropsList } from '../utils/engineAdapters';

export interface PokerTableScreenProps {
  settings: GameSettings;
  rng?: Rng;
  onExit: () => void;
  onViewHistory: () => void;
  handHistory: HandHistoryManager;
  onUpdateHistory: (history: HandHistoryManager) => void;
  gameState: GameState | null;
  onUpdateGameState: (state: GameState) => void;
}

export function PokerTableScreen({ 
  settings, 
  rng,
  onExit, 
  onViewHistory, 
  handHistory, 
  onUpdateHistory,
  gameState: externalGameState,
  onUpdateGameState 
}: PokerTableScreenProps) {
  const rngRef = useRef(rng ?? createSeededRng(Date.now()));
  useEffect(() => {
    if (rng) {
      rngRef.current = rng;
    }
  }, [rng]);
  const [gameState, setGameStateInternal] = useState<GameState>(() => {
    // Use external game state if available, otherwise initialize new game
    if (externalGameState) {
      return externalGameState;
    }
    const initialState = initializeGame(settings);
    return startNewHand(initialState, rngRef.current);
  });
  
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [showBettingSlider, setShowBettingSlider] = useState(false);
  const [showingDown, setShowingDown] = useState(false);
  const [handWinner, setHandWinner] = useState<number | null>(null);
  
  // Wrapper function to update both internal and external game state
  const setGameState = (state: GameState) => {
    setGameStateInternal(state);
    onUpdateGameState(state);
  };
  
  // Replay match handler - resets everything and starts fresh
  const handleReplayMatch = () => {
    rngRef.current = createSeededRng(Date.now());
    // Initialize fresh game state with same settings
    const initialState = initializeGame(settings);
    const newGameState = startNewHand(initialState, rngRef.current);
    
    // Reset game state
    setGameState(newGameState);
    
    // Reset action log
    setActionLog([]);
    
    // Reset hand history
    const freshHistory: HandHistoryManager = {
      hands: [],
      currentHandActions: [],
      currentHandStartStacks: [newGameState.players[0].stack, newGameState.players[1].stack]
    };
    onUpdateHistory(freshHistory);
    
    // Add initial log for first hand
    const updatedHistory = addActionToCurrentHand(
      freshHistory,
      `Hand #${newGameState.handNumber} started`
    );
    
    const buttonPlayer = newGameState.players[0].isButton ? newGameState.players[0] : newGameState.players[1];
    const updatedHistory2 = addActionToCurrentHand(
      updatedHistory,
      `${buttonPlayer.name} is the button`
    );
    
    onUpdateHistory(updatedHistory2);
    
    // Update action log display
    seedActionLog([
      `Hand #${newGameState.handNumber} started`,
      `${buttonPlayer.name} is the button`
    ]);
  };
  
  const appendActionLog = (texts: string[]) => {
    setActionLog(prev => {
      const baseId = Date.now();
      const newEntries = texts.map((text, idx) => ({
        id: `${baseId}-${idx}-${Math.random()}`,
        text
      }));
      return [...prev, ...newEntries];
    });
  };
  
  const addLog = (text: string) => {
    appendActionLog([text]);
    onUpdateHistory(addActionToCurrentHand(handHistory, text));
  };
  
  const seedActionLog = (entries: string[]) => {
    const baseId = Date.now();
    setActionLog(
      entries.map((text, idx) => ({
        id: `${baseId}-${idx}-${Math.random()}`,
        text
      }))
    );
  };

  // Helper function to log all-in runout cards
  const logAllInRunout = (prevStreet: Street, newState: GameState, updatedHistory: HandHistoryManager) => {
    let history = updatedHistory;
    
    // Check if we went straight to showdown from an earlier street (all-in situation)
    if (newState.street === 'Showdown' && prevStreet !== 'River' && newState.communityCards.length === 5) {
      // Add all-in log
      history = addActionToCurrentHand(history, `--- All-in, dealing remaining cards ---`);
      
      // Log based on what street we were on
      if (prevStreet === 'Preflop') {
        // Log flop
        const flopCards = newState.communityCards.slice(0, 3);
        history = addActionToCurrentHand(history, `--- Flop: ${flopCards.map(formatCard).join(' ')} ---`);
        // Log turn
        const turnCard = newState.communityCards[3];
        history = addActionToCurrentHand(history, `--- Turn: ${formatCard(turnCard)} ---`);
        // Log river
        const riverCard = newState.communityCards[4];
        history = addActionToCurrentHand(history, `--- River: ${formatCard(riverCard)} ---`);
      } else if (prevStreet === 'Flop') {
        // Log turn
        const turnCard = newState.communityCards[3];
        history = addActionToCurrentHand(history, `--- Turn: ${formatCard(turnCard)} ---`);
        // Log river
        const riverCard = newState.communityCards[4];
        history = addActionToCurrentHand(history, `--- River: ${formatCard(riverCard)} ---`);
      } else if (prevStreet === 'Turn') {
        // Log river only
        const riverCard = newState.communityCards[4];
        history = addActionToCurrentHand(history, `--- River: ${formatCard(riverCard)} ---`);
      }
    }
    
    return history;
  };
  
  // Helper function to add runout logs to action log display
  const addRunoutToActionLog = (prevStreet: Street, newState: GameState) => {
    // Check if we went straight to showdown from an earlier street (all-in situation)
    if (newState.street === 'Showdown' && prevStreet !== 'River' && newState.communityCards.length === 5) {
      const runoutLogs: string[] = [];
      runoutLogs.push(`--- All-in, dealing remaining cards ---`);
      
      if (prevStreet === 'Preflop') {
        const flopCards = newState.communityCards.slice(0, 3);
        runoutLogs.push(`--- Flop: ${flopCards.map(formatCard).join(' ')} ---`);
        const turnCard = newState.communityCards[3];
        runoutLogs.push(`--- Turn: ${formatCard(turnCard)} ---`);
        const riverCard = newState.communityCards[4];
        runoutLogs.push(`--- River: ${formatCard(riverCard)} ---`);
      } else if (prevStreet === 'Flop') {
        const turnCard = newState.communityCards[3];
        runoutLogs.push(`--- Turn: ${formatCard(turnCard)} ---`);
        const riverCard = newState.communityCards[4];
        runoutLogs.push(`--- River: ${formatCard(riverCard)} ---`);
      } else if (prevStreet === 'Turn') {
        const riverCard = newState.communityCards[4];
        runoutLogs.push(`--- River: ${formatCard(riverCard)} ---`);
      }

      appendActionLog(runoutLogs);
    }
  };
  
  // Initialize first hand
  useEffect(() => {
    // Only add initial logs if hand history is empty (first hand of the game)
    if (handHistory.hands.length === 0 && handHistory.currentHandActions.length === 0) {
      addLog(`Hand #${gameState.handNumber} started`);
      const buttonPlayer = gameState.players[0].isButton ? gameState.players[0] : gameState.players[1];
      const bbPlayer = gameState.players[0].isButton ? gameState.players[1] : gameState.players[0];
      addLog(`${buttonPlayer.name} posts small blind $${gameState.smallBlind}`);
      addLog(`${bbPlayer.name} posts big blind $${gameState.bigBlind}`);
      
      // Log dealt cards
      addLog(`${gameState.players[0].name} dealt: ${gameState.players[0].cards.map(formatCard).join(' ')}`);
      addLog(`${gameState.players[1].name} dealt: ${gameState.players[1].cards.map(formatCard).join(' ')}`);
    }
  }, []); // Empty dependency array - only run once on mount

  // Handle AI turns
  useEffect(() => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Check if it's AI's turn and game is not complete - ALSO CHECK IF GAME IS OVER
    if (currentPlayer.type === 'ai' && !gameState.isHandComplete && !showingDown && !gameState.gameOver) {
      const timer = setTimeout(() => {
        // Always use Warren's AI (advanced AI)
        const aiAction = getAdvancedAIAction(
          gameState,
          gameState.currentPlayerIndex,
          undefined,
          rngRef.current
        );
        handleAIAction(aiAction);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayerIndex, gameState.street, gameState.isHandComplete, showingDown, gameState.gameOver]);

  // Handle showdown
  useEffect(() => {
    if (gameState.street === 'Showdown' && !showingDown && !gameState.gameOver) {
      setShowingDown(true);
      setTimeout(() => {
        performShowdown();
      }, 1000);
    }
  }, [gameState.street, gameState.gameOver]);

  // Handle hand completion (fold or showdown complete)
  useEffect(() => {
    if (gameState.isHandComplete && !showingDown && !gameState.gameOver) {
      // Check if someone folded
      const folded = gameState.players.find(p => p.folded);
      if (folded) {
        const winner = gameState.players.find(p => !p.folded)!;
        const winnerIndex = gameState.players.indexOf(winner);
        setHandWinner(winnerIndex); // Set the winner
        addLog(`${winner.name} wins the pot ($${gameState.pot})`);
        
        setTimeout(() => {
          // Capture pot before awarding it
          const potAmount = gameState.pot;
          
          // Award pot first, then check if game is over
          const newState = awardPot(gameState, winnerIndex);
          const updatedHistory = completeHandRecord(handHistory, newState, potAmount, winnerIndex);
          onUpdateHistory(updatedHistory);
          
          // Check if game is over - if so, just update state and return
          if (newState.gameOver) {
            setGameState(newState);
            return;
          }
          
          // Capture stacks BEFORE starting new hand
          const stacksBeforeNewHand: [number, number] = [newState.players[0].stack, newState.players[1].stack];
          
          const nextState = startNewHand(newState, rngRef.current);
          setGameState(nextState);
          setActionLog([]);
          
          // Clear hand winner when starting new hand
          setHandWinner(null);
          
          // Start new hand record with captured stacks
          let newHistory: HandHistoryManager = {
            ...updatedHistory,
            currentHandActions: [],
            currentHandStartStacks: stacksBeforeNewHand
          };
          
          // Add logs using the updated history
          const newHandLogs: string[] = [];
          newHandLogs.push(`Hand #${nextState.handNumber} started`);
          newHistory = addActionToCurrentHand(newHistory, newHandLogs[0]);
          const buttonPlayer = nextState.players[0].isButton ? nextState.players[0] : nextState.players[1];
          const bbPlayer = nextState.players[0].isButton ? nextState.players[1] : nextState.players[0];
          newHandLogs.push(`${buttonPlayer.name} posts small blind $${nextState.smallBlind}`);
          newHandLogs.push(`${bbPlayer.name} posts big blind $${nextState.bigBlind}`);
          newHandLogs.push(`${nextState.players[0].name} dealt: ${nextState.players[0].cards.map(formatCard).join(' ')}`);
          newHandLogs.push(`${nextState.players[1].name} dealt: ${nextState.players[1].cards.map(formatCard).join(' ')}`);
          newHistory = addActionToCurrentHand(newHistory, newHandLogs[1]);
          newHistory = addActionToCurrentHand(newHistory, newHandLogs[2]);
          newHistory = addActionToCurrentHand(newHistory, newHandLogs[3]);
          newHistory = addActionToCurrentHand(newHistory, newHandLogs[4]);
          
          onUpdateHistory(newHistory);
          seedActionLog(newHandLogs);
        }, 2000);
      }
    }
  }, [gameState.isHandComplete]);

  const handleAIAction = (action: any) => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const prevStreet = gameState.street;
    
    if (action.type === 'fold') {
      addLog(`${currentPlayer.name} folds`);
      const { state: newState } = applyAction(
        gameState,
        { type: 'fold' },
        rngRef.current
      );
      setGameState(newState);
    } else if (action.type === 'check') {
      const { state: newState } = applyAction(
        gameState,
        { type: 'check' },
        rngRef.current
      );
      
      // Chain history updates to avoid stale state
      let updatedHistory = addActionToCurrentHand(handHistory, `${currentPlayer.name} checks`);
      
      // Log street change if it happened with the new cards
      if (newState.street !== prevStreet && newState.street !== 'Showdown') {
        if (newState.street === 'Flop' && newState.communityCards.length === 3) {
          const flopCards = newState.communityCards.slice(0, 3);
          updatedHistory = addActionToCurrentHand(updatedHistory, `--- Flop: ${flopCards.map(formatCard).join(' ')} ---`);
        } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
          const turnCard = newState.communityCards[3];
          updatedHistory = addActionToCurrentHand(updatedHistory, `--- Turn: ${formatCard(turnCard)} ---`);
        } else if (newState.street === 'River' && newState.communityCards.length === 5) {
          const riverCard = newState.communityCards[4];
          updatedHistory = addActionToCurrentHand(updatedHistory, `--- River: ${formatCard(riverCard)} ---`);
        }
      }
      
      // Update action log for display
      const actionLogEntries: string[] = [];
      actionLogEntries.push(`${currentPlayer.name} checks`);
      if (newState.street !== prevStreet && newState.street !== 'Showdown') {
        if (newState.street === 'Flop' && newState.communityCards.length === 3) {
          const flopCards = newState.communityCards.slice(0, 3);
          actionLogEntries.push(`--- Flop: ${flopCards.map(formatCard).join(' ')} ---`);
        } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
          const turnCard = newState.communityCards[3];
          actionLogEntries.push(`--- Turn: ${formatCard(turnCard)} ---`);
        } else if (newState.street === 'River' && newState.communityCards.length === 5) {
          const riverCard = newState.communityCards[4];
          actionLogEntries.push(`--- River: ${formatCard(riverCard)} ---`);
        }
      }
      appendActionLog(actionLogEntries);
      
      onUpdateHistory(updatedHistory);
      setGameState(newState);
    } else if (action.type === 'call') {
      const validActions = getValidActions(gameState);
      const prevStreet = gameState.street;
      
      // Calculate actual call amount (might be less if player doesn't have enough chips)
      const actualCallAmount = Math.min(validActions.callAmount, currentPlayer.stack);
      
      const { state: newState } = applyAction(
        gameState,
        { type: 'call' },
        rngRef.current
      );
      
      // Chain history updates to avoid stale state
      let updatedHistory = addActionToCurrentHand(handHistory, `${currentPlayer.name} calls $${actualCallAmount}`);
      
      // Check for all-in runout
      updatedHistory = logAllInRunout(prevStreet, newState, updatedHistory);
      
      // Log street change if it happened with the new cards
      if (newState.street !== prevStreet && newState.street !== 'Showdown') {
        if (newState.street === 'Flop' && newState.communityCards.length === 3) {
          const flopCards = newState.communityCards.slice(0, 3);
          updatedHistory = addActionToCurrentHand(updatedHistory, `--- Flop: ${flopCards.map(formatCard).join(' ')} ---`);
        } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
          const turnCard = newState.communityCards[3];
          updatedHistory = addActionToCurrentHand(updatedHistory, `--- Turn: ${formatCard(turnCard)} ---`);
        } else if (newState.street === 'River' && newState.communityCards.length === 5) {
          const riverCard = newState.communityCards[4];
          updatedHistory = addActionToCurrentHand(updatedHistory, `--- River: ${formatCard(riverCard)} ---`);
        }
      }
      
      // Update action log for display
      appendActionLog([`${currentPlayer.name} calls $${actualCallAmount}`]);
      
      // Add all-in runout logs
      addRunoutToActionLog(prevStreet, newState);
      
      if (newState.street !== prevStreet && newState.street !== 'Showdown') {
        if (newState.street === 'Flop' && newState.communityCards.length === 3) {
          const flopCards = newState.communityCards.slice(0, 3);
          appendActionLog([`--- Flop: ${flopCards.map(formatCard).join(' ')} ---`]);
        } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
          const turnCard = newState.communityCards[3];
          appendActionLog([`--- Turn: ${formatCard(turnCard)} ---`]);
        } else if (newState.street === 'River' && newState.communityCards.length === 5) {
          const riverCard = newState.communityCards[4];
          appendActionLog([`--- River: ${formatCard(riverCard)} ---`]);
        }
      }
      
      onUpdateHistory(updatedHistory);
      setGameState(newState);
    } else if (action.type === 'raise') {
      const { state: newState } = applyAction(
        gameState,
        { type: 'raise', amount: action.amount },
        rngRef.current
      );
      
      // Chain history updates to avoid stale state
      let updatedHistory = addActionToCurrentHand(handHistory, `${currentPlayer.name} raises to $${action.amount}`);
      
      // Log street change if it happened with the new cards
      if (newState.street !== prevStreet && newState.street !== 'Showdown') {
        if (newState.street === 'Flop' && newState.communityCards.length === 3) {
          const flopCards = newState.communityCards.slice(0, 3);
          updatedHistory = addActionToCurrentHand(updatedHistory, `--- Flop: ${flopCards.map(formatCard).join(' ')} ---`);
        } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
          const turnCard = newState.communityCards[3];
          updatedHistory = addActionToCurrentHand(updatedHistory, `--- Turn: ${formatCard(turnCard)} ---`);
        } else if (newState.street === 'River' && newState.communityCards.length === 5) {
          const riverCard = newState.communityCards[4];
          updatedHistory = addActionToCurrentHand(updatedHistory, `--- River: ${formatCard(riverCard)} ---`);
        }
      }
      
      // Update action log for display
      appendActionLog([`${currentPlayer.name} raises to $${action.amount}`]);
      if (newState.street !== prevStreet && newState.street !== 'Showdown') {
        if (newState.street === 'Flop' && newState.communityCards.length === 3) {
          const flopCards = newState.communityCards.slice(0, 3);
          appendActionLog([`--- Flop: ${flopCards.map(formatCard).join(' ')} ---`]);
        } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
          const turnCard = newState.communityCards[3];
          appendActionLog([`--- Turn: ${formatCard(turnCard)} ---`]);
        } else if (newState.street === 'River' && newState.communityCards.length === 5) {
          const riverCard = newState.communityCards[4];
          appendActionLog([`--- River: ${formatCard(riverCard)} ---`]);
        }
      }
      
      onUpdateHistory(updatedHistory);
      setGameState(newState);
    }
  };

  const performShowdown = () => {
    const { winner, p1Hand, p2Hand } = determineWinner(gameState);
    
    // Set the hand winner for visual effect
    setHandWinner(winner);
    
    // Add showdown logs to action log
    addLog(`--- Showdown ---`);
    addLog(`${gameState.players[0].name}: ${p1Hand.description}`);
    addLog(`${gameState.players[1].name}: ${p2Hand.description}`);
    
    let newState: GameState;
    if (winner === null) {
      addLog('Pot split!');
      newState = awardPot(gameState, null);
    } else {
      addLog(`${gameState.players[winner].name} wins the pot ($${gameState.pot})`);
      newState = awardPot(gameState, winner);
    }
    
    setTimeout(() => {
      // Manually add showdown info to hand history before completing
      let updated = addActionToCurrentHand(handHistory, `--- Showdown ---`);
      updated = addActionToCurrentHand(updated, `${gameState.players[0].name}: ${p1Hand.description}`);
      updated = addActionToCurrentHand(updated, `${gameState.players[1].name}: ${p2Hand.description}`);
      if (winner === null) {
        updated = addActionToCurrentHand(updated, 'Pot split!');
      } else {
        updated = addActionToCurrentHand(updated, `${gameState.players[winner].name} wins the pot ($${gameState.pot})`);
      }
      
      // Capture pot before awarding it
      const potAmount = gameState.pot;
      
      // Complete hand record with the newState that has pot already awarded
      updated = completeHandRecord(updated, newState, potAmount, winner, p1Hand, p2Hand);
      onUpdateHistory(updated);
      
      // Check if game is over
      if (newState.gameOver) {
        setGameState(newState);
        setShowingDown(false);
        return;
      }
      
      // Capture stacks BEFORE starting new hand
      const stacksBeforeNewHand: [number, number] = [newState.players[0].stack, newState.players[1].stack];
      
      const nextState = startNewHand(newState, rngRef.current);
      setGameState(nextState);
      setShowingDown(false);
      setActionLog([]);
      
      // Clear hand winner when starting new hand
      setHandWinner(null);
      
      // Start new hand record with captured stacks
      let newHistory: HandHistoryManager = {
        ...updated,
        currentHandActions: [],
        currentHandStartStacks: stacksBeforeNewHand
      };
      
      // Add logs using the updated history
      const newHandLogs: string[] = [];
      newHandLogs.push(`Hand #${nextState.handNumber} started`);
      newHistory = addActionToCurrentHand(newHistory, newHandLogs[0]);
      const buttonPlayer = nextState.players[0].isButton ? nextState.players[0] : nextState.players[1];
      const bbPlayer = nextState.players[0].isButton ? nextState.players[1] : nextState.players[0];
      newHandLogs.push(`${buttonPlayer.name} posts small blind $${nextState.smallBlind}`);
      newHandLogs.push(`${bbPlayer.name} posts big blind $${nextState.bigBlind}`);
      newHandLogs.push(`${nextState.players[0].name} dealt: ${nextState.players[0].cards.map(formatCard).join(' ')}`);
      newHandLogs.push(`${nextState.players[1].name} dealt: ${nextState.players[1].cards.map(formatCard).join(' ')}`);
      newHistory = addActionToCurrentHand(newHistory, newHandLogs[1]);
      newHistory = addActionToCurrentHand(newHistory, newHandLogs[2]);
      newHistory = addActionToCurrentHand(newHistory, newHandLogs[3]);
      newHistory = addActionToCurrentHand(newHistory, newHandLogs[4]);
      
      onUpdateHistory(newHistory);
      seedActionLog(newHandLogs);
    }, 3000);
  };

  const handleFold = () => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    addLog(`${currentPlayer.name} folds`);
    const { state: newState } = applyAction(
      gameState,
      { type: 'fold' },
      rngRef.current
    );
    setGameState(newState);
  };

  const handleCheck = () => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const { state: newState } = applyAction(
      gameState,
      { type: 'check' },
      rngRef.current
    );
    
    // Chain history updates to avoid stale state
    let updatedHistory = addActionToCurrentHand(handHistory, `${currentPlayer.name} checks`);
    
    // Log street change if it happened with the new cards
    if (newState.street !== gameState.street && newState.street !== 'Showdown') {
      if (newState.street === 'Flop' && newState.communityCards.length === 3) {
        const flopCards = newState.communityCards.slice(0, 3);
        updatedHistory = addActionToCurrentHand(updatedHistory, `--- Flop: ${flopCards.map(formatCard).join(' ')} ---`);
      } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
        const turnCard = newState.communityCards[3];
        updatedHistory = addActionToCurrentHand(updatedHistory, `--- Turn: ${formatCard(turnCard)} ---`);
      } else if (newState.street === 'River' && newState.communityCards.length === 5) {
        const riverCard = newState.communityCards[4];
        updatedHistory = addActionToCurrentHand(updatedHistory, `--- River: ${formatCard(riverCard)} ---`);
      }
    }
    
    // Update action log for display
    const actionLogEntries: string[] = [];
    actionLogEntries.push(`${currentPlayer.name} checks`);
    if (newState.street !== gameState.street && newState.street !== 'Showdown') {
      if (newState.street === 'Flop' && newState.communityCards.length === 3) {
        const flopCards = newState.communityCards.slice(0, 3);
        actionLogEntries.push(`--- Flop: ${flopCards.map(formatCard).join(' ')} ---`);
      } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
        const turnCard = newState.communityCards[3];
        actionLogEntries.push(`--- Turn: ${formatCard(turnCard)} ---`);
      } else if (newState.street === 'River' && newState.communityCards.length === 5) {
        const riverCard = newState.communityCards[4];
        actionLogEntries.push(`--- River: ${formatCard(riverCard)} ---`);
      }
    }
    appendActionLog(actionLogEntries);
    
    onUpdateHistory(updatedHistory);
    setGameState(newState);
  };

  const handleCall = () => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const validActions = getValidActions(gameState);
    const prevStreet = gameState.street;
    
    // Calculate actual call amount (might be less if player doesn't have enough chips)
    const actualCallAmount = Math.min(validActions.callAmount, currentPlayer.stack);
    
    const { state: newState } = applyAction(
      gameState,
      { type: 'call' },
      rngRef.current
    );
    
    // Chain history updates to avoid stale state
    let updatedHistory = addActionToCurrentHand(handHistory, `${currentPlayer.name} calls $${actualCallAmount}`);
    
    // Check for all-in runout
    updatedHistory = logAllInRunout(prevStreet, newState, updatedHistory);
    
    // Log street change if it happened with the new cards
    if (newState.street !== prevStreet && newState.street !== 'Showdown') {
      if (newState.street === 'Flop' && newState.communityCards.length === 3) {
        const flopCards = newState.communityCards.slice(0, 3);
        updatedHistory = addActionToCurrentHand(updatedHistory, `--- Flop: ${flopCards.map(formatCard).join(' ')} ---`);
      } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
        const turnCard = newState.communityCards[3];
        updatedHistory = addActionToCurrentHand(updatedHistory, `--- Turn: ${formatCard(turnCard)} ---`);
      } else if (newState.street === 'River' && newState.communityCards.length === 5) {
        const riverCard = newState.communityCards[4];
        updatedHistory = addActionToCurrentHand(updatedHistory, `--- River: ${formatCard(riverCard)} ---`);
      }
    }
    
    // Update action log for display
    appendActionLog([`${currentPlayer.name} calls $${actualCallAmount}`]);
    
    // Add all-in runout logs
    addRunoutToActionLog(prevStreet, newState);
    
    if (newState.street !== prevStreet && newState.street !== 'Showdown') {
      if (newState.street === 'Flop' && newState.communityCards.length === 3) {
        const flopCards = newState.communityCards.slice(0, 3);
        appendActionLog([`--- Flop: ${flopCards.map(formatCard).join(' ')} ---`]);
      } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
        const turnCard = newState.communityCards[3];
        appendActionLog([`--- Turn: ${formatCard(turnCard)} ---`]);
      } else if (newState.street === 'River' && newState.communityCards.length === 5) {
        const riverCard = newState.communityCards[4];
        appendActionLog([`--- River: ${formatCard(riverCard)} ---`]);
      }
    }
    
    onUpdateHistory(updatedHistory);
    setGameState(newState);
  };

  const handleRaise = () => {
    setShowBettingSlider(true);
  };

  const handleBet = (amount: number) => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    setShowBettingSlider(false);
    const { state: newState } = applyAction(
      gameState,
      { type: 'raise', amount },
      rngRef.current
    );
    
    // Chain history updates to avoid stale state
    let updatedHistory = addActionToCurrentHand(handHistory, `${currentPlayer.name} raises to $${amount}`);
    
    // Log street change if it happened with the new cards
    if (newState.street !== gameState.street && newState.street !== 'Showdown') {
      if (newState.street === 'Flop' && newState.communityCards.length === 3) {
        const flopCards = newState.communityCards.slice(0, 3);
        updatedHistory = addActionToCurrentHand(updatedHistory, `--- Flop: ${flopCards.map(formatCard).join(' ')} ---`);
      } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
        const turnCard = newState.communityCards[3];
        updatedHistory = addActionToCurrentHand(updatedHistory, `--- Turn: ${formatCard(turnCard)} ---`);
      } else if (newState.street === 'River' && newState.communityCards.length === 5) {
        const riverCard = newState.communityCards[4];
        updatedHistory = addActionToCurrentHand(updatedHistory, `--- River: ${formatCard(riverCard)} ---`);
      }
    }
    
    // Update action log for display
    appendActionLog([`${currentPlayer.name} raises to $${amount}`]);
    if (newState.street !== gameState.street && newState.street !== 'Showdown') {
      if (newState.street === 'Flop' && newState.communityCards.length === 3) {
        const flopCards = newState.communityCards.slice(0, 3);
        appendActionLog([`--- Flop: ${flopCards.map(formatCard).join(' ')} ---`]);
      } else if (newState.street === 'Turn' && newState.communityCards.length === 4) {
        const turnCard = newState.communityCards[3];
        appendActionLog([`--- Turn: ${formatCard(turnCard)} ---`]);
      } else if (newState.street === 'River' && newState.communityCards.length === 5) {
        const riverCard = newState.communityCards[4];
        appendActionLog([`--- River: ${formatCard(riverCard)} ---`]);
      }
    }
    
    onUpdateHistory(updatedHistory);
    setGameState(newState);
  };

  const validActions = getValidActions(gameState);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // Only enable buttons if it's a human player's turn
  const canAct = currentPlayer.type === 'human' && !gameState.isHandComplete && !showingDown;

  // Get display values
  const player1 = gameState.players[0];
  const player2 = gameState.players[1];

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Game Over Modal */}
      {gameState.gameOver && gameState.winner !== undefined && (
        <GameOverModal
          winnerName={gameState.players[gameState.winner].name}
          winnerStack={gameState.players[gameState.winner].stack}
          loserName={gameState.players[1 - gameState.winner].name}
          totalHands={handHistory.hands.length}
          onViewHistory={onViewHistory}
          onReturnToLobby={onExit}
          onReplayMatch={handleReplayMatch}
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

          <div className="flex items-center gap-8">
            <div className="text-cyan-400 uppercase tracking-widest">
              Hand <span className="text-green-400 font-semibold font-mono">#{gameState.handNumber}</span>
            </div>
            <div className="text-cyan-400 uppercase tracking-widest">
              Street: <span className="text-yellow-400 font-semibold font-mono">{gameState.street}</span>
            </div>
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

      {/* Main Game Area */}
      <div className="flex-1 flex">
        {/* Poker Table */}
        <div className="flex-1 flex items-center justify-center p-5">
          <div className="relative w-full max-w-3xl">
            
            {/* Player 2 Seat & Cards (Top - Outside Table) */}
            <div className="flex flex-col items-center gap-2 mb-3">
              <PlayerSeat
                name={player2.name}
                stack={player2.stack}
                isDealer={player2.isButton}
                isActive={gameState.currentPlayerIndex === 1 && !gameState.isHandComplete}
                hasFolded={player2.folded}
                isWinner={handWinner === 1}
              />
              {/* Player 2 Cards */}
              <div className="flex gap-2">
                {player2.cards.map((card, idx) => (
                  <Card key={idx} {...toCardProps(card)} className="scale-90 origin-top-left" />
                ))}
              </div>
            </div>

            {/* Poker Table Felt */}
            <div className="relative bg-gradient-to-br from-felt-700 to-felt-800 rounded-[160px] border-8 border-felt-900 shadow-2xl px-10 py-14 min-h-[320px]">
              
              {/* Player 2 Bet (On Table, Top) */}
              {player2.bet > 0 && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black px-3 py-1 border-2 border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]">
                  <div className="text-yellow-400 text-sm font-semibold font-mono">${player2.bet.toLocaleString()}</div>
                </div>
              )}

              {/* Community Cards & Pot */}
              <div className="flex items-center justify-center gap-4 h-full pt-12">
                <PotDisplay amount={gameState.pot} />
                <CommunityCards
                  cards={toCardPropsList(gameState.communityCards)}
                />
              </div>

              {/* Player 1 Bet (On Table, Bottom) */}
              {player1.bet > 0 && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-black px-3 py-1 border-2 border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]">
                  <div className="text-yellow-400 text-sm font-semibold font-mono">${player1.bet.toLocaleString()}</div>
                </div>
              )}
            </div>

            {/* Player 1 Seat & Cards (Bottom - Outside Table) */}
            <div className="flex flex-col items-center gap-2 mt-3">
              {/* Player 1 Cards */}
              <div className="flex gap-2">
                {player1.cards.map((card, idx) => (
                  <Card key={idx} {...toCardProps(card)} className="scale-90 origin-top-left" />
                ))}
              </div>
              <PlayerSeat
                name={player1.name}
                stack={player1.stack}
                isDealer={player1.isButton}
                isActive={gameState.currentPlayerIndex === 0 && !gameState.isHandComplete}
                hasFolded={player1.folded}
                isWinner={handWinner === 0}
              />
            </div>

            {/* Action Controls */}
            <div className="mt-6">
              {showBettingSlider ? (
                <BettingSlider
                  min={validActions.minRaise}
                  max={validActions.maxRaise}
                  currentBet={currentPlayer.bet}
                  potSize={gameState.pot}
                  bigBlind={gameState.bigBlind}
                  onBet={handleBet}
                  onCancel={() => setShowBettingSlider(false)}
                />
              ) : (
                <div className="flex gap-3 justify-center">
                  <ActionButton 
                    variant="danger" 
                    onClick={handleFold}
                    disabled={!canAct}
                  >
                    Fold
                  </ActionButton>
                  <ActionButton 
                    variant="secondary" 
                    onClick={handleCheck}
                    disabled={!canAct || !validActions.canCheck}
                  >
                    Check
                  </ActionButton>
                  <ActionButton 
                    variant="primary" 
                    onClick={handleCall}
                    disabled={!canAct || !validActions.canCall}
                  >
                    Call ${validActions.canCall ? validActions.callAmount : 0}
                  </ActionButton>
                  <ActionButton 
                    variant="primary" 
                    onClick={handleRaise}
                    disabled={!canAct || (!validActions.canRaise && !validActions.canBet)}
                  >
                    Bet / Raise
                  </ActionButton>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Log Sidebar */}
        <div className="w-80 bg-black border-l-2 border-cyan-500 p-6">
          <ActionLog entries={actionLog} className="h-full" />
        </div>
      </div>
    </div>
  );
}