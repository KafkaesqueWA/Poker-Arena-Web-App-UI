import { GameSettings, GameState, Player, Street } from "./types";
import {
  createDeck,
  evaluateHand,
  compareHands,
  EvaluatedHand,
} from "./pokerEngine";
import { Rng, createMathRandomRng } from "./rng";

// Initialize a new game
export function initializeGame(settings: GameSettings): GameState {
  const player1: Player = {
    name: settings.playerName,
    type: settings.player1Type,
    stack: settings.startingStack,
    bet: 0,
    cards: [],
    folded: false,
    isButton: true, // Player 1 starts as button
    hasActed: false,
  };

  const player2: Player = {
    name: settings.player2Name,
    type: settings.player2Type,
    stack: settings.startingStack,
    bet: 0,
    cards: [],
    folded: false,
    isButton: false,
    hasActed: false,
  };

  return {
    handNumber: 0,
    street: "Preflop",
    pot: 0,
    communityCards: [],
    players: [player1, player2],
    currentPlayerIndex: 0,
    deck: [],
    smallBlind: settings.smallBlind,
    bigBlind: settings.bigBlind,
    lastRaiseAmount: settings.bigBlind,
    isHandComplete: false,
  };
}

// Start a new hand
export function startNewHand(
  state: GameState,
  rng: Rng = createMathRandomRng(),
): GameState {
  const newState = { ...state };

  // Switch button
  newState.players[0].isButton = !newState.players[0].isButton;
  newState.players[1].isButton = !newState.players[1].isButton;

  // Reset players
  newState.players = newState.players.map((p) => ({
    ...p,
    bet: 0,
    cards: [],
    folded: false,
    hasActed: false,
  })) as [Player, Player];

  // Create and shuffle deck
  newState.deck = createDeck(rng);
  newState.communityCards = [];
  newState.pot = 0;
  newState.street = "Preflop";
  newState.handNumber += 1;
  newState.isHandComplete = false;
  newState.lastRaiseAmount = newState.bigBlind;

  // In heads-up: button posts SB, other player posts BB
  const buttonIndex = newState.players[0].isButton ? 0 : 1;
  const bbIndex = buttonIndex === 0 ? 1 : 0;

  // Post blinds (cap by remaining stacks)
  const sbAmount = Math.min(
    newState.smallBlind,
    newState.players[buttonIndex].stack,
  );
  const bbAmount = Math.min(
    newState.bigBlind,
    newState.players[bbIndex].stack,
  );
  newState.players[buttonIndex].bet = sbAmount;
  newState.players[buttonIndex].stack -= sbAmount;
  newState.players[bbIndex].bet = bbAmount;
  newState.players[bbIndex].stack -= bbAmount;
  newState.pot = sbAmount + bbAmount;

  // Set last raise amount for preflop using actual posted blinds
  newState.lastRaiseAmount = bbAmount - sbAmount;

  // Deal cards
  newState.players[0].cards = [
    newState.deck.pop()!,
    newState.deck.pop()!,
  ];
  newState.players[1].cards = [
    newState.deck.pop()!,
    newState.deck.pop()!,
  ];

  // In heads-up preflop: button (SB) acts first
  // Post-flop: button acts last (so BB acts first)
  newState.currentPlayerIndex = buttonIndex;

  return newState;
}

// Player action: fold
export function playerFold(state: GameState): GameState {
  const newState = { ...state };
  const currentPlayer =
    newState.players[newState.currentPlayerIndex];
  currentPlayer.folded = true;
  newState.isHandComplete = true;
  return newState;
}

// Player action: check
export function playerCheck(state: GameState): GameState {
  const newState = { ...state };
  const currentPlayer =
    newState.players[newState.currentPlayerIndex];
  currentPlayer.hasActed = true;

  // Check if betting round is complete
  if (isBettingRoundComplete(newState)) {
    return advanceStreet(newState);
  } else {
    newState.currentPlayerIndex =
      (newState.currentPlayerIndex + 1) % 2;
  }

  return newState;
}

// Player action: call
export function playerCall(state: GameState): GameState {
  const newState = { ...state };
  const currentPlayer =
    newState.players[newState.currentPlayerIndex];
  const opponent =
    newState.players[(newState.currentPlayerIndex + 1) % 2];

  const callAmount = opponent.bet - currentPlayer.bet;
  const actualCall = Math.min(callAmount, currentPlayer.stack);

  currentPlayer.bet += actualCall;
  currentPlayer.stack -= actualCall;
  newState.pot += actualCall;
  currentPlayer.hasActed = true;

  // Check if betting round is complete
  if (isBettingRoundComplete(newState)) {
    return advanceStreet(newState);
  } else {
    newState.currentPlayerIndex =
      (newState.currentPlayerIndex + 1) % 2;
  }

  return newState;
}

// Player action: raise/bet
export function playerRaise(
  state: GameState,
  raiseToAmount: number,
): GameState {
  const newState = { ...state };
  const currentPlayer =
    newState.players[newState.currentPlayerIndex];
  const opponent =
    newState.players[(newState.currentPlayerIndex + 1) % 2];

  const effectiveMaxRaise =
    opponent.bet + opponent.stack;
  const cappedRaiseToAmount = Math.min(
    raiseToAmount,
    effectiveMaxRaise,
  );

  const additionalBet =
    cappedRaiseToAmount - currentPlayer.bet;
  const actualBet = Math.min(additionalBet, currentPlayer.stack);

  currentPlayer.bet += actualBet;
  currentPlayer.stack -= actualBet;
  newState.pot += actualBet;
  currentPlayer.hasActed = true;

  // Update last raise amount for min-raise calculations
  newState.lastRaiseAmount = currentPlayer.bet - opponent.bet;

  // Opponent needs to act again
  opponent.hasActed = false;

  // Switch to opponent
  newState.currentPlayerIndex =
    (newState.currentPlayerIndex + 1) % 2;

  return newState;
}

// Check if betting round is complete
function isBettingRoundComplete(state: GameState): boolean {
  const [p1, p2] = state.players;

  // If someone folded, round is complete
  if (p1.folded || p2.folded) return true;

  // If someone is all-in and both players have acted, round is complete
  // (They might have different bet amounts if one couldn't match the full bet)
  if (p1.stack === 0 || p2.stack === 0) {
    // If both have acted, betting is done (one is all-in)
    if (p1.hasActed && p2.hasActed) return true;
    // If only one is all-in and they both put chips in, betting is done
    if (
      p1.bet > 0 &&
      p2.bet > 0 &&
      (p1.stack === 0 || p2.stack === 0)
    ) {
      return p1.hasActed && p2.hasActed;
    }
  }

  // Both players must have acted and bets must match
  return p1.hasActed && p2.hasActed && p1.bet === p2.bet;
}

// Advance to next street
function advanceStreet(state: GameState): GameState {
  const newState = { ...state };

  // Check if someone is all-in - if so, deal all remaining cards
  const isAllIn =
    newState.players[0].stack === 0 ||
    newState.players[1].stack === 0;

  if (isAllIn && newState.street !== "River") {
    // Deal all remaining community cards and go to showdown
    return dealRemainingCards(newState);
  }

  // Reset action flags
  newState.players[0].hasActed = false;
  newState.players[1].hasActed = false;

  // Reset bets (moved to pot)
  newState.players[0].bet = 0;
  newState.players[1].bet = 0;

  if (newState.street === "Preflop") {
    // Deal flop
    newState.deck.pop(); // Burn card
    newState.communityCards = [
      newState.deck.pop()!,
      newState.deck.pop()!,
      newState.deck.pop()!,
    ];
    newState.street = "Flop";

    // Post-flop: BB acts first (opposite of button)
    const buttonIndex = newState.players[0].isButton ? 0 : 1;
    newState.currentPlayerIndex = (buttonIndex + 1) % 2;
  } else if (newState.street === "Flop") {
    // Deal turn
    newState.deck.pop(); // Burn card
    newState.communityCards.push(newState.deck.pop()!);
    newState.street = "Turn";

    const buttonIndex = newState.players[0].isButton ? 0 : 1;
    newState.currentPlayerIndex = (buttonIndex + 1) % 2;
  } else if (newState.street === "Turn") {
    // Deal river
    newState.deck.pop(); // Burn card
    newState.communityCards.push(newState.deck.pop()!);
    newState.street = "River";

    const buttonIndex = newState.players[0].isButton ? 0 : 1;
    newState.currentPlayerIndex = (buttonIndex + 1) % 2;
  } else if (newState.street === "River") {
    // Go to showdown
    newState.street = "Showdown";
    newState.isHandComplete = true;
  }

  return newState;
}

// Deal all remaining community cards (used when all-in)
export function dealRemainingCards(state: GameState): GameState {
  let newState = { ...state };

  // Reset action flags and bets
  newState.players[0].hasActed = false;
  newState.players[1].hasActed = false;
  newState.players[0].bet = 0;
  newState.players[1].bet = 0;

  // Deal remaining cards based on current street
  if (newState.street === "Preflop") {
    // Deal flop
    newState.deck.pop(); // Burn card
    newState.communityCards = [
      newState.deck.pop()!,
      newState.deck.pop()!,
      newState.deck.pop()!,
    ];
    // Deal turn
    newState.deck.pop(); // Burn card
    newState.communityCards.push(newState.deck.pop()!);
    // Deal river
    newState.deck.pop(); // Burn card
    newState.communityCards.push(newState.deck.pop()!);
  } else if (newState.street === "Flop") {
    // Deal turn
    newState.deck.pop(); // Burn card
    newState.communityCards.push(newState.deck.pop()!);
    // Deal river
    newState.deck.pop(); // Burn card
    newState.communityCards.push(newState.deck.pop()!);
  } else if (newState.street === "Turn") {
    // Deal river only
    newState.deck.pop(); // Burn card
    newState.communityCards.push(newState.deck.pop()!);
  }

  // Go directly to showdown
  newState.street = "Showdown";
  newState.isHandComplete = true;

  return newState;
}

// Determine winner at showdown
export function determineWinner(state: GameState): {
  winner: number | null;
  p1Hand: EvaluatedHand;
  p2Hand: EvaluatedHand;
} {
  const p1Cards = [
    ...state.players[0].cards,
    ...state.communityCards,
  ];
  const p2Cards = [
    ...state.players[1].cards,
    ...state.communityCards,
  ];

  const p1Hand = evaluateHand(p1Cards);
  const p2Hand = evaluateHand(p2Cards);

  const result = compareHands(p1Hand, p2Hand);

  return {
    winner: result > 0 ? 0 : result < 0 ? 1 : null, // null = tie
    p1Hand,
    p2Hand,
  };
}

// Award pot to winner
export function awardPot(
  state: GameState,
  winnerIndex: number | null,
): GameState {
  const newState = { ...state };

  if (winnerIndex === null) {
    // Split pot
    const split = Math.floor(newState.pot / 2);
    newState.players[0].stack += split;
    newState.players[1].stack += split;
    // Any odd chip goes to the button
    const oddChip = newState.pot % 2;
    const buttonIndex = newState.players[0].isButton ? 0 : 1;
    newState.players[buttonIndex].stack += oddChip;
  } else {
    newState.players[winnerIndex].stack += newState.pot;
  }

  newState.pot = 0;

  // Check if game is over (someone has 0 or negative chips)
  if (newState.players[0].stack <= 0) {
    newState.gameOver = true;
    newState.winner = 1; // Player 2 wins
  } else if (newState.players[1].stack <= 0) {
    newState.gameOver = true;
    newState.winner = 0; // Player 1 wins
  }

  return newState;
}

// Get valid actions for current player
export function getValidActions(state: GameState): {
  canCheck: boolean;
  canCall: boolean;
  canBet: boolean;
  canRaise: boolean;
  minRaise: number;
  maxRaise: number;
  callAmount: number;
} {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const opponent =
    state.players[(state.currentPlayerIndex + 1) % 2];

  const canCheck = currentPlayer.bet === opponent.bet;
  const canCall =
    opponent.bet > currentPlayer.bet && currentPlayer.stack > 0;
  const callAmount = opponent.bet - currentPlayer.bet;

  const canBet =
    currentPlayer.bet === 0 &&
    opponent.bet === 0 &&
    currentPlayer.stack > 0;
  const canRaise =
    opponent.bet > 0 && currentPlayer.stack > callAmount;

  // Min raise calculation:
  // - If making first bet: minimum is the big blind
  // - If raising: minimum is opponent's bet + last raise amount
  const minRaise = canBet
    ? state.bigBlind
    : opponent.bet + state.lastRaiseAmount;
  const maxRaise = Math.min(
    currentPlayer.stack + currentPlayer.bet,
    opponent.stack + opponent.bet,
  );

  return {
    canCheck,
    canCall,
    canBet,
    canRaise,
    minRaise,
    maxRaise,
    callAmount,
  };
}

export type { Street };
