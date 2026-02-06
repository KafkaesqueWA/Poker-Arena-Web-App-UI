import { Card, GameState } from "./types";
import { EvaluatedHand } from "./pokerEngine";

export interface HandRecord {
  handNumber: number;
  player1Name: string;
  player2Name: string;
  player1StartStack: number;
  player2StartStack: number;
  player1EndStack: number;
  player2EndStack: number;
  player1Cards: Card[];
  player2Cards: Card[];
  communityCards: Card[];
  finalPot: number;
  winner: number | null; // 0 = player1, 1 = player2, null = split
  player1Hand?: EvaluatedHand;
  player2Hand?: EvaluatedHand;
  actions: string[];
  smallBlind: number;
  bigBlind: number;
  buttonPlayer: number; // 0 or 1
}

export interface HandHistoryManager {
  hands: HandRecord[];
  currentHandActions: string[];
  currentHandStartStacks: [number, number];
}

export function createHandHistoryManager(): HandHistoryManager {
  return {
    hands: [],
    currentHandActions: [],
    currentHandStartStacks: [0, 0],
  };
}

export function startHandRecord(
  manager: HandHistoryManager,
  gameState: GameState,
): HandHistoryManager {
  return {
    ...manager,
    currentHandActions: [],
    currentHandStartStacks: [
      gameState.players[0].stack,
      gameState.players[1].stack,
    ],
  };
}

export function addActionToCurrentHand(
  manager: HandHistoryManager,
  action: string,
): HandHistoryManager {
  return {
    ...manager,
    currentHandActions: [...manager.currentHandActions, action],
  };
}

export function completeHandRecord(
  manager: HandHistoryManager,
  gameState: GameState,
  finalPot: number,
  winner: number | null,
  player1Hand?: EvaluatedHand,
  player2Hand?: EvaluatedHand,
): HandHistoryManager {
  const record: HandRecord = {
    handNumber: gameState.handNumber,
    player1Name: gameState.players[0].name,
    player2Name: gameState.players[1].name,
    player1StartStack: manager.currentHandStartStacks[0],
    player2StartStack: manager.currentHandStartStacks[1],
    player1EndStack: gameState.players[0].stack,
    player2EndStack: gameState.players[1].stack,
    player1Cards: [...gameState.players[0].cards],
    player2Cards: [...gameState.players[1].cards],
    communityCards: [...gameState.communityCards],
    finalPot,
    winner,
    player1Hand,
    player2Hand,
    actions: [...manager.currentHandActions],
    smallBlind: gameState.smallBlind,
    bigBlind: gameState.bigBlind,
    buttonPlayer: gameState.players[0].isButton ? 0 : 1,
  };

  return {
    ...manager,
    hands: [...manager.hands, record],
    currentHandActions: [],
    currentHandStartStacks: [0, 0],
  };
}

export function clearHistory(
  manager: HandHistoryManager,
): HandHistoryManager {
  return createHandHistoryManager();
}
