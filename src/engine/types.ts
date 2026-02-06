export const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
] as const;

export const SUITS = [
  "hearts",
  "diamonds",
  "clubs",
  "spades",
] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Street =
  | "Preflop"
  | "Flop"
  | "Turn"
  | "River"
  | "Showdown";

export type PlayerType = "human" | "ai";

export interface Player {
  name: string;
  type: PlayerType;
  stack: number;
  bet: number;
  cards: Card[];
  folded: boolean;
  isButton: boolean;
  hasActed: boolean;
}

export interface GameState {
  handNumber: number;
  street: Street;
  pot: number;
  communityCards: Card[];
  players: [Player, Player];
  currentPlayerIndex: number;
  deck: Card[];
  smallBlind: number;
  bigBlind: number;
  lastRaiseAmount: number;
  isHandComplete: boolean;
  gameOver?: boolean;
  winner?: number;
}

export interface GameSettings {
  playerName: string;
  player2Name: string;
  player1Type: PlayerType;
  player2Type: PlayerType;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  seed?: number;
}

export type Action =
  | { type: "startHand" }
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; amount: number };

export type EngineEvent =
  | { type: "handStarted"; handNumber: number }
  | { type: "action"; action: Action; playerIndex: number }
  | { type: "street"; street: Street }
  | { type: "cards"; street: Street; cards: Card[] }
  | {
      type: "handComplete";
      reason: "fold" | "showdown" | "all-in";
    };
