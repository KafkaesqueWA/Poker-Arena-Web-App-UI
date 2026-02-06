import { GameState, getValidActions } from "./gameState";
import { evaluateHand, HandRank } from "./pokerEngine";
import { Card } from "./types";
import { Rng, createMathRandomRng } from "./rng";

export type AIAction =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; amount: number };

// Simple AI that makes decisions based on hand strength
export function getAIAction(
  state: GameState,
  playerIndex: number,
  rng: Rng = createMathRandomRng(),
): AIAction {
  const player = state.players[playerIndex];
  const actions = getValidActions(state);

  // Evaluate hand strength
  const allCards = [...player.cards, ...state.communityCards];
  const handStrength = getHandStrength(allCards, state.street);

  // Calculate pot odds if facing a bet
  const potOdds = actions.canCall
    ? actions.callAmount / (state.pot + actions.callAmount)
    : 0;

  // Post-flop strategy
  if (state.street !== "Preflop") {
    return getPostFlopAction(
      state,
      playerIndex,
      handStrength,
      actions,
      potOdds,
      rng,
    );
  }

  // Preflop strategy
  return getPreflopAction(
    state,
    playerIndex,
    handStrength,
    actions,
    potOdds,
    rng,
  );
}

// Preflop decision logic
function getPreflopAction(
  state: GameState,
  playerIndex: number,
  handStrength: number,
  actions: any,
  potOdds: number,
  rng: Rng,
): AIAction {
  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];

  // Premium hands (0.85+): Always raise/3-bet
  if (handStrength >= 0.85) {
    if (actions.canRaise || actions.canBet) {
      const raiseAmount = calculateRaiseSize(
        state,
        playerIndex,
        "value",
        rng,
      );
      return { type: "raise", amount: raiseAmount };
    }
    return { type: "call" };
  }

  // Strong hands (0.7-0.85): Raise or call raises
  if (handStrength >= 0.7) {
    if (actions.canCheck) {
      // In position, sometimes check to trap
      if (rng.next() > 0.7 && actions.canBet) {
        const raiseAmount = calculateRaiseSize(
          state,
          playerIndex,
          "value",
          rng,
        );
        return { type: "raise", amount: raiseAmount };
      }
      return { type: "check" };
    }
    if (actions.canRaise && rng.next() > 0.4) {
      const raiseAmount = calculateRaiseSize(
        state,
        playerIndex,
        "value",
        rng,
      );
      return { type: "raise", amount: raiseAmount };
    }
    if (actions.canCall) {
      return { type: "call" };
    }
  }

  // Good hands (0.55-0.7): Call or raise occasionally
  if (handStrength >= 0.55) {
    if (actions.canCheck) return { type: "check" };
    if (actions.canCall && potOdds < 0.3) {
      return { type: "call" };
    }
    if (actions.canRaise && rng.next() > 0.7) {
      const raiseAmount = calculateRaiseSize(
        state,
        playerIndex,
        "value",
        rng,
      );
      return { type: "raise", amount: raiseAmount };
    }
    if (actions.canCall && potOdds < 0.4) {
      return { type: "call" };
    }
    return { type: "fold" };
  }

  // Marginal hands (0.4-0.55): Call small bets
  if (handStrength >= 0.4) {
    if (actions.canCheck) return { type: "check" };
    if (actions.canCall && potOdds < 0.2) {
      return { type: "call" };
    }
    return { type: "fold" };
  }

  // Weak hands: Check/fold
  if (actions.canCheck) return { type: "check" };
  return { type: "fold" };
}

// Post-flop decision logic
function getPostFlopAction(
  state: GameState,
  playerIndex: number,
  handStrength: number,
  actions: any,
  potOdds: number,
  rng: Rng,
): AIAction {
  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];

  // Analyze drawing potential
  const drawInfo = analyzeDraws(
    player.cards,
    state.communityCards,
  );
  const hasDraw =
    drawInfo.hasFlushDraw || drawInfo.hasStraightDraw;
  const drawStrength = getDrawStrength(drawInfo);

  // Analyze board texture
  const boardTexture = analyzeBoardTexture(
    state.communityCards,
  );

  // Combine made hand strength with draw potential
  const effectiveStrength = Math.max(
    handStrength,
    drawStrength,
  );

  // Monster hands (0.85+): Always value bet/raise
  if (handStrength >= 0.85) {
    if (actions.canRaise || actions.canBet) {
      // Large bets with very strong hands
      const raiseAmount = calculateRaiseSize(
        state,
        playerIndex,
        "value",
        rng,
        "large",
      );
      return { type: "raise", amount: raiseAmount };
    }
    if (actions.canCall) {
      return { type: "call" };
    }
    return { type: "check" };
  }

  // Strong hands (0.7-0.85): Value bet, sometimes slow-play
  if (handStrength >= 0.7) {
    if (actions.canCheck) {
      // Sometimes check-raise with strong hands
      if (rng.next() > 0.6 && actions.canBet) {
        const raiseAmount = calculateRaiseSize(
          state,
          playerIndex,
          "value",
          rng,
          "medium",
        );
        return { type: "raise", amount: raiseAmount };
      }
      return { type: "check" };
    }
    if (actions.canRaise && rng.next() > 0.3) {
      const raiseAmount = calculateRaiseSize(
        state,
        playerIndex,
        "value",
        rng,
        "medium",
      );
      return { type: "raise", amount: raiseAmount };
    }
    if (actions.canCall && potOdds < 0.4) {
      return { type: "call" };
    }
    return { type: "fold" };
  }

  // Good hands (0.55-0.7): Value bet smaller, call bets
  if (handStrength >= 0.55) {
    if (actions.canCheck) {
      // Sometimes bet for value
      if (rng.next() > 0.5 && actions.canBet) {
        const raiseAmount = calculateRaiseSize(
          state,
          playerIndex,
          "value",
          rng,
          "small",
        );
        return { type: "raise", amount: raiseAmount };
      }
      return { type: "check" };
    }
    if (actions.canCall && potOdds < 0.35) {
      return { type: "call" };
    }
    if (actions.canRaise && rng.next() > 0.7) {
      const raiseAmount = calculateRaiseSize(
        state,
        playerIndex,
        "value",
        rng,
        "small",
      );
      return { type: "raise", amount: raiseAmount };
    }
    return { type: "fold" };
  }

  // Drawing hands: Check pot odds and implied odds
  if (hasDraw && handStrength >= 0.3) {
    if (actions.canCheck) {
      // Sometimes semi-bluff with draws
      if (
        rng.next() > 0.7 &&
        actions.canBet &&
        boardTexture.isDraw
      ) {
        const raiseAmount = calculateRaiseSize(
          state,
          playerIndex,
          "semi-bluff",
          rng,
        );
        return { type: "raise", amount: raiseAmount };
      }
      return { type: "check" };
    }

    // Call with good pot odds on draws
    if (actions.canCall) {
      const requiredEquity = potOdds;
      const estimatedEquity = drawStrength;

      if (estimatedEquity > requiredEquity * 1.2) {
        // Good pot odds, call
        return { type: "call" };
      }
    }

    // Semi-bluff occasionally
    if (
      (actions.canRaise || actions.canBet) &&
      rng.next() > 0.85
    ) {
      const raiseAmount = calculateRaiseSize(
        state,
        playerIndex,
        "semi-bluff",
        rng,
      );
      return { type: "raise", amount: raiseAmount };
    }

    return { type: "fold" };
  }

  // Weak hands (0.3-0.55): Check/call small bets, bluff occasionally
  if (handStrength >= 0.3) {
    if (actions.canCheck) {
      // Bluff on scary boards occasionally
      if (
        boardTexture.isScary &&
        rng.next() > 0.85 &&
        actions.canBet
      ) {
        const raiseAmount = calculateRaiseSize(
          state,
          playerIndex,
          "bluff",
          rng,
        );
        return { type: "raise", amount: raiseAmount };
      }
      return { type: "check" };
    }
    if (actions.canCall && potOdds < 0.2) {
      return { type: "call" };
    }
    return { type: "fold" };
  }

  // Very weak hands: Check/fold, rare bluffs
  if (actions.canCheck) {
    // Rare bluff on river with scary boards
    if (
      state.street === "River" &&
      boardTexture.isScary &&
      rng.next() > 0.9 &&
      actions.canBet
    ) {
      const raiseAmount = calculateRaiseSize(
        state,
        playerIndex,
        "bluff",
        rng,
      );
      return { type: "raise", amount: raiseAmount };
    }
    return { type: "check" };
  }

  return { type: "fold" };
}

// Calculate hand strength (0-1 scale)
function getHandStrength(cards: Card[], street: string): number {
  if (cards.length < 2) return 0;

  const evaluated = evaluateHand(cards);

  // Base strength on hand rank
  let strength = 0;

  switch (evaluated.rank) {
    case HandRank.RoyalFlush:
      strength = 1.0;
      break;
    case HandRank.StraightFlush:
      strength = 0.95;
      break;
    case HandRank.FourOfAKind:
      strength = 0.9;
      break;
    case HandRank.FullHouse:
      strength = 0.85;
      break;
    case HandRank.Flush:
      strength = 0.75;
      break;
    case HandRank.Straight:
      strength = 0.7;
      break;
    case HandRank.ThreeOfAKind:
      strength = 0.65;
      break;
    case HandRank.TwoPair:
      strength = 0.55;
      break;
    case HandRank.Pair:
      strength = 0.4;
      break;
    case HandRank.HighCard:
      strength = 0.2;
      break;
  }

  // Adjust for preflop (hole cards only)
  if (street === "Preflop" && cards.length === 2) {
    strength = getPreflopStrength(cards);
  }

  return strength;
}

// Get preflop hand strength
function getPreflopStrength(holeCards: Card[]): number {
  if (holeCards.length !== 2) return 0;

  const ranks = holeCards.map((c) => c.rank);
  const suited = holeCards[0].suit === holeCards[1].suit;

  // Premium pairs
  if (ranks[0] === ranks[1]) {
    const rank = ranks[0];
    if (["A", "K", "Q"].includes(rank)) return 0.9;
    if (["J", "10"].includes(rank)) return 0.8;
    if (["9", "8"].includes(rank)) return 0.7;
    return 0.6; // Any pair
  }

  // High cards
  const hasAce = ranks.includes("A");
  const hasKing = ranks.includes("K");
  const hasQueen = ranks.includes("Q");
  const hasJack = ranks.includes("J");

  if (hasAce && hasKing) return suited ? 0.85 : 0.75;
  if (hasAce && hasQueen) return suited ? 0.75 : 0.65;
  if (hasAce && hasJack) return suited ? 0.7 : 0.6;
  if (hasKing && hasQueen) return suited ? 0.7 : 0.6;
  if (hasKing && hasJack) return suited ? 0.65 : 0.55;
  if (hasQueen && hasJack) return suited ? 0.6 : 0.5;

  // Face card
  if (hasAce || hasKing) return suited ? 0.5 : 0.4;

  // Suited connectors
  if (suited) return 0.45;

  // Weak hands
  return 0.3;
}

// Calculate raise size
function calculateRaiseSize(
  state: GameState,
  playerIndex: number,
  betType: "value" | "bluff" | "semi-bluff",
  rng: Rng,
  size?: "small" | "medium" | "large",
): number {
  const player = state.players[playerIndex];
  const actions = getValidActions(state);
  const pot = state.pot;

  let raiseSize: number;

  if (betType === "value") {
    // Value bet: 50-75% of pot
    if (size === "small") {
      raiseSize = Math.floor(pot * (0.25 + rng.next() * 0.25));
    } else if (size === "medium") {
      raiseSize = Math.floor(pot * (0.5 + rng.next() * 0.25));
    } else if (size === "large") {
      raiseSize = Math.floor(pot * (0.75 + rng.next() * 0.25));
    } else {
      raiseSize = Math.floor(pot * (0.5 + rng.next() * 0.25));
    }
  } else {
    // Bluff: 33-66% of pot
    raiseSize = Math.floor(pot * (0.33 + rng.next() * 0.33));
  }

  // Ensure it meets minimum raise
  raiseSize = Math.max(raiseSize, actions.minRaise);

  // Cap at player's stack
  raiseSize = Math.min(raiseSize, actions.maxRaise);

  // Don't go below minimum
  if (raiseSize < actions.minRaise) {
    raiseSize = actions.maxRaise; // Go all-in if can't meet min raise
  }

  return raiseSize;
}

// Analyze drawing potential
function analyzeDraws(
  holeCards: Card[],
  communityCards: Card[],
): {
  hasFlushDraw: boolean;
  hasStraightDraw: boolean;
  outs: number;
} {
  if (communityCards.length < 3) {
    return {
      hasFlushDraw: false,
      hasStraightDraw: false,
      outs: 0,
    };
  }

  const allCards = [...holeCards, ...communityCards];

  // Check for flush draw (4 cards of same suit)
  const suitCounts: Record<string, number> = {};
  allCards.forEach((card) => {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  });
  const hasFlushDraw = Object.values(suitCounts).some(
    (count) => count === 4,
  );

  // Check for straight draw (open-ended or gutshot)
  const rankValues: Record<string, number> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  };

  const uniqueRanks = Array.from(
    new Set(allCards.map((c) => rankValues[c.rank])),
  ).sort((a, b) => a - b);

  let hasStraightDraw = false;
  // Check for 4 cards in sequence (with gaps <= 1)
  for (let i = 0; i <= uniqueRanks.length - 4; i++) {
    const fourCards = uniqueRanks.slice(i, i + 4);
    const span = fourCards[3] - fourCards[0];
    if (span <= 4) {
      hasStraightDraw = true;
      break;
    }
  }

  // Special case: A-2-3-4 or A-K-Q-J
  if (uniqueRanks.includes(14)) {
    const lowStraight = [14, 2, 3, 4].every((v) =>
      uniqueRanks.includes(v),
    );
    const highStraight = [14, 13, 12, 11].every((v) =>
      uniqueRanks.includes(v),
    );
    if (lowStraight || highStraight) {
      hasStraightDraw = true;
    }
  }

  // Estimate outs
  let outs = 0;
  if (hasFlushDraw) outs += 9; // 9 cards to complete flush
  if (hasStraightDraw) outs += 8; // Approximate straight outs
  if (hasFlushDraw && hasStraightDraw) outs = 15; // Some overlap

  return { hasFlushDraw, hasStraightDraw, outs };
}

// Get draw strength based on outs and street
function getDrawStrength(drawInfo: {
  hasFlushDraw: boolean;
  hasStraightDraw: boolean;
  outs: number;
}): number {
  if (drawInfo.outs === 0) return 0;

  // Estimate equity based on outs (rough rule of 2 for turn, 4 for flop)
  const equity = drawInfo.outs * 0.04; // Approximate equity

  return Math.min(equity, 0.7); // Cap at 0.7
}

// Analyze board texture
function analyzeBoardTexture(communityCards: Card[]): {
  isDraw: boolean;
  isScary: boolean;
  isPaired: boolean;
} {
  if (communityCards.length < 3) {
    return { isDraw: false, isScary: false, isPaired: false };
  }

  const ranks = communityCards.map((c) => c.rank);
  const suits = communityCards.map((c) => c.suit);

  // Check for paired board
  const rankCounts: Record<string, number> = {};
  ranks.forEach((rank) => {
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  });
  const isPaired = Object.values(rankCounts).some(
    (count) => count >= 2,
  );

  // Check for flush draw on board (3+ of same suit)
  const suitCounts: Record<string, number> = {};
  suits.forEach((suit) => {
    suitCounts[suit] = (suitCounts[suit] || 0) + 1;
  });
  const hasFlushDrawOnBoard = Object.values(suitCounts).some(
    (count) => count >= 3,
  );

  // Check for straight possibilities
  const rankValues: Record<string, number> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  };
  const uniqueRanks = Array.from(
    new Set(ranks.map((r) => rankValues[r])),
  ).sort((a, b) => a - b);

  let hasStraightDrawOnBoard = false;
  if (uniqueRanks.length >= 3) {
    // Check if 3 cards are close together
    const maxGap =
      uniqueRanks[uniqueRanks.length - 1] - uniqueRanks[0];
    if (maxGap <= 4) {
      hasStraightDrawOnBoard = true;
    }
  }

  const isDraw = hasFlushDrawOnBoard || hasStraightDrawOnBoard;

  // Scary boards: paired, flush draw, or straight draw
  const isScary =
    isPaired || hasFlushDrawOnBoard || hasStraightDrawOnBoard;

  return { isDraw, isScary, isPaired };
}
