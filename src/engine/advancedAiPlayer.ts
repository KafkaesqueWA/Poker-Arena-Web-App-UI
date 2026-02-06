import { GameState, getValidActions } from "./gameState";
import { evaluateHand, HandRank } from "./pokerEngine";
import { Card, RANKS } from "./types";
import {
  calculateHandStrength,
  calculateEffectiveHandStrength,
  categorizeHandStrength,
  isNuts,
} from "./handStrength";
import { Rng, createMathRandomRng } from "./rng";

export type AIAction =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; amount: number };

// Personality configuration
interface BotPersonality {
  aggression: number; // 0-1: how often to bet vs check/call
  bluffFactor: number; // 0-1: frequency of bluffs
  riskTolerance: number; // 0-1: willingness to make hero calls
}

const DEFAULT_PERSONALITY: BotPersonality = {
  aggression: 0.85, // Much more aggressive
  bluffFactor: 0.7, // Bluff frequently in heads-up
  riskTolerance: 0.4,
};

// Main decision function
export function getAdvancedAIAction(
  state: GameState,
  playerIndex: number,
  personality: BotPersonality = DEFAULT_PERSONALITY,
  rng: Rng = createMathRandomRng(),
): AIAction {
  const player = state.players[playerIndex];
  const actions = getValidActions(state);

  if (state.street === "Preflop") {
    return getPreflopAction(
      state,
      playerIndex,
      actions,
      personality,
      rng,
    );
  } else {
    return getPostflopAction(
      state,
      playerIndex,
      actions,
      personality,
      rng,
    );
  }
}

// ============================================================================
// PREFLOP STRATEGY
// ============================================================================

type HandTier = "premium" | "strong" | "playable" | "trash";

function getPreflopAction(
  state: GameState,
  playerIndex: number,
  actions: any,
  personality: BotPersonality,
  rng: Rng,
): AIAction {
  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];
  const isButton = player.isButton;

  const handTier = classifyPreflopHand(player.cards);

  // Button/SB opening strategy
  if (isButton && opponent.bet === state.bigBlind) {
    return getButtonOpeningAction(
      state,
      handTier,
      actions,
      personality,
      rng,
    );
  }

  // Big blind facing a raise
  if (!isButton && opponent.bet > player.bet) {
    return getBigBlindDefenseAction(
      state,
      handTier,
      actions,
      personality,
      rng,
    );
  }

  // Facing a 3-bet
  if (opponent.bet > state.bigBlind * 2) {
    return getFacing3BetAction(
      state,
      handTier,
      actions,
      personality,
      rng,
    );
  }

  // Default: check if possible, otherwise fold
  if (actions.canCheck) return { type: "check" };
  return { type: "fold" };
}

function classifyPreflopHand(cards: Card[]): HandTier {
  const [c1, c2] = cards;
  const rank1 = RANKS.indexOf(c1.rank);
  const rank2 = RANKS.indexOf(c2.rank);
  const highRank = Math.max(rank1, rank2);
  const lowRank = Math.min(rank1, rank2);
  const suited = c1.suit === c2.suit;
  const pair = rank1 === rank2;
  const gap = highRank - lowRank;

  // Premium hands: AA-88, AJ+, KQ
  if (pair && highRank >= 6) return "premium"; // 88+
  if (highRank === 12 && lowRank >= 9) return "premium"; // AT+
  if (highRank === 11 && lowRank >= 10) return "premium"; // KQ+

  // Strong hands: Any pair, any ace, KT+, QT+, suited broadways, suited connectors 76s+
  if (pair) return "strong"; // Any pocket pair
  if (highRank === 12) return "strong"; // Any ace
  if (highRank === 11 && lowRank >= 8) return "strong"; // K9+
  if (highRank === 10 && lowRank >= 8) return "strong"; // Q9+
  if (suited && highRank >= 9 && lowRank >= 8) return "strong"; // Suited broadways (JTs+, QTs+, etc)
  if (suited && gap <= 1 && lowRank >= 4) return "strong"; // Suited connectors 65s+
  if (suited && gap === 2 && lowRank >= 5) return "strong"; // Suited 1-gappers 75s+

  // Playable hands: King-high, Queen-high, suited anything, connected cards
  if (highRank >= 11) return "playable"; // Any king or queen
  if (suited && highRank >= 8) return "playable"; // Any suited 9+
  if (suited && gap <= 3) return "playable"; // Suited 2-3 gappers
  if (gap <= 2 && highRank >= 7) return "playable"; // Connected 8-high+
  if (highRank >= 9 && lowRank >= 6) return "playable"; // Jack-high+ with 7+ kicker

  return "trash";
}

function getButtonOpeningAction(
  state: GameState,
  handTier: HandTier,
  actions: any,
  personality: BotPersonality,
  rng: Rng,
): AIAction {
  const roll = rng.next();
  const aggMod = personality.aggression;

  switch (handTier) {
    case "premium":
      // 95% raise, 5% call (for balance)
      if (roll < 0.95) {
        return {
          type: "raise",
          amount: calculateRaiseSize(state, "value", 3),
        };
      }
      return { type: "call" };

    case "strong":
      // 85% raise, 15% call
      if (roll < 0.85 * aggMod) {
        return {
          type: "raise",
          amount: calculateRaiseSize(state, "value", 2.5),
        };
      }
      return { type: "call" };

    case "playable":
      // 60% raise, 30% call, 10% fold
      if (roll < 0.6 * aggMod) {
        return {
          type: "raise",
          amount: calculateRaiseSize(state, "value", 2.5),
        };
      } else if (roll < 0.9) {
        return { type: "call" };
      }
      return { type: "fold" };

    case "trash":
      // 35% raise (bluff), 65% fold - More aggressive bluffing in HU
      if (roll < 0.35 * personality.bluffFactor) {
        return {
          type: "raise",
          amount: calculateRaiseSize(state, "bluff", 2.5),
        };
      }
      return { type: "fold" };
  }
}

function getBigBlindDefenseAction(
  state: GameState,
  handTier: HandTier,
  actions: any,
  personality: BotPersonality,
  rng: Rng,
): AIAction {
  const roll = rng.next();
  const raiseSize =
    state.players[1 - state.currentPlayerIndex].bet;
  const isMinRaise = raiseSize <= state.bigBlind * 2.5;

  switch (handTier) {
    case "premium":
      // Always 3-bet
      if (actions.canRaise) {
        return {
          type: "raise",
          amount: calculateRaiseSize(state, "value", 3.5),
        };
      }
      return { type: "call" };

    case "strong":
      // 80% 3-bet, 20% call (increased from 60/40)
      if (roll < 0.8 && actions.canRaise) {
        return {
          type: "raise",
          amount: calculateRaiseSize(state, "value", 3),
        };
      }
      return { type: "call" };

    case "playable":
      // Much more aggressive 3-betting
      if (isMinRaise) {
        // 40% 3-bet, 50% call, 10% fold (increased from 20% 3-bet)
        if (
          roll < 0.4 * personality.aggression &&
          actions.canRaise
        ) {
          return {
            type: "raise",
            amount: calculateRaiseSize(state, "bluff", 3),
          };
        } else if (roll < 0.9) {
          return { type: "call" };
        }
      } else {
        if (roll < 0.4) {
          return { type: "call" };
        }
      }
      return { type: "fold" };

    case "trash":
      // More aggressive light 3-bets (25% vs 10%)
      if (
        roll < 0.25 * personality.bluffFactor &&
        actions.canRaise
      ) {
        return {
          type: "raise",
          amount: calculateRaiseSize(state, "bluff", 3),
        };
      }
      return { type: "fold" };
  }
}

function getFacing3BetAction(
  state: GameState,
  handTier: HandTier,
  actions: any,
  personality: BotPersonality,
  rng: Rng,
): AIAction {
  const roll = rng.next();

  switch (handTier) {
    case "premium":
      // Always continue (call or 4-bet)
      if (roll < 0.4 && actions.canRaise) {
        return {
          type: "raise",
          amount: Math.min(actions.maxRaise, state.pot * 2),
        };
      }
      return { type: "call" };

    case "strong":
      // 70% call, 30% fold
      if (roll < 0.7) {
        return { type: "call" };
      }
      return { type: "fold" };

    default:
      // Mostly fold, occasional bluff
      if (roll < 0.1 * personality.bluffFactor) {
        return { type: "call" };
      }
      return { type: "fold" };
  }
}

// ============================================================================
// POSTFLOP STRATEGY
// ============================================================================

type HandCategory =
  | "monster"
  | "strong"
  | "medium"
  | "draw"
  | "air";
type BoardTexture = "dry" | "semi-connected" | "wet";

function getPostflopAction(
  state: GameState,
  playerIndex: number,
  actions: any,
  personality: BotPersonality,
  rng: Rng,
): AIAction {
  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];

  // Evaluate hand
  const allCards = [...player.cards, ...state.communityCards];
  const handEval = evaluateHand(allCards);

  // Classify hand strength
  const handCategory = classifyPostflopHand(
    player.cards,
    state.communityCards,
    handEval,
  );

  // Analyze board
  const boardTexture = analyzeBoardTexture(state.communityCards);

  // Check for draws
  const drawInfo = analyzeDraws(
    player.cards,
    state.communityCards,
  );

  // Calculate pot odds if facing a bet
  const potOdds = actions.canCall
    ? actions.callAmount / (state.pot + actions.callAmount)
    : 0;

  // In position vs out of position adjustments
  const inPosition = isInPosition(state, playerIndex);

  return decidePostflopAction(
    state,
    playerIndex,
    handCategory,
    boardTexture,
    drawInfo,
    actions,
    potOdds,
    inPosition,
    personality,
    rng,
  );
}

function classifyPostflopHand(
  holeCards: Card[],
  communityCards: Card[],
  handEval: {
    rank: HandRank;
    description: string;
    value: number;
  },
): HandCategory {
  // Calculate relative hand strength (what % of hands we beat)
  const relativeStrength = calculateHandStrength(
    holeCards,
    communityCards,
  );
  const strengthCategory =
    categorizeHandStrength(relativeStrength);

  // Use relative strength as primary classifier
  if (
    strengthCategory === "nuts" ||
    strengthCategory === "very-strong"
  ) {
    return "monster";
  }

  if (strengthCategory === "strong") {
    return "strong";
  }

  // For medium strength, check if we have draws that add value
  if (strengthCategory === "medium") {
    const drawInfo = analyzeDraws(holeCards, communityCards);
    if (drawInfo.hasFlushDraw || drawInfo.hasOESD) {
      return "draw"; // Strong draw is more valuable than marginal made hand
    }
    return "medium";
  }

  // Weak hands - check for draws
  if (
    strengthCategory === "weak" ||
    strengthCategory === "very-weak"
  ) {
    const drawInfo = analyzeDraws(holeCards, communityCards);
    if (drawInfo.hasFlushDraw || drawInfo.hasOESD) {
      return "draw";
    }

    // Pure air
    return "air";
  }

  return "air";
}

function analyzeBoardTexture(communityCards: Card[]): BoardTexture {
  if (communityCards.length < 3) return "dry";

  const ranks = communityCards
    .map((c) => RANKS.indexOf(c.rank))
    .sort((a, b) => b - a);
  const suits = communityCards.map((c) => c.suit);

  // Check for flush draw (2+ same suit)
  const suitCounts: Record<string, number> = {};
  suits.forEach(
    (s) => (suitCounts[s] = (suitCounts[s] || 0) + 1),
  );
  const hasFlushDraw = Object.values(suitCounts).some(
    (count) => count >= 2,
  );

  // Check for straight possibilities
  const maxGap = ranks[0] - ranks[ranks.length - 1];
  const hasStraightDraw = maxGap <= 4;

  // Check for connectivity
  let connectedCards = 0;
  for (let i = 0; i < ranks.length - 1; i++) {
    if (ranks[i] - ranks[i + 1] <= 2) connectedCards++;
  }

  // Wet board: flush draw + straight draw
  if (hasFlushDraw && hasStraightDraw) return "wet";

  // Semi-connected: some connectivity
  if (connectedCards >= 1 || hasFlushDraw || hasStraightDraw)
    return "semi-connected";

  // Dry board: rainbow, disconnected
  return "dry";
}

interface DrawInfo {
  hasFlushDraw: boolean;
  hasOESD: boolean; // Open-ended straight draw
  hasGutshot: boolean;
  outs: number;
}

function analyzeDraws(
  holeCards: Card[],
  communityCards: Card[],
): DrawInfo {
  const allCards = [...holeCards, ...communityCards];

  // Flush draw check
  const suitCounts: Record<string, number> = {};
  allCards.forEach(
    (c) => (suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1),
  );
  const hasFlushDraw = Object.values(suitCounts).some(
    (count) => count >= 4,
  );

  // Straight draw check
  const ranks = allCards
    .map((c) => RANKS.indexOf(c.rank))
    .sort((a, b) => a - b);
  const uniqueRanks = Array.from(new Set(ranks));

  let hasOESD = false;
  let hasGutshot = false;

  // Check for straight possibilities
  for (let i = 0; i < uniqueRanks.length - 3; i++) {
    const gap = uniqueRanks[i + 3] - uniqueRanks[i];
    if (gap === 3) hasOESD = true; // 4 cards in sequence, needs 1 on either end
    if (gap === 4 && i + 4 < uniqueRanks.length) hasOESD = true; // Already have 4 in sequence
  }

  // Gutshot check (simpler - just check for 4-card gaps with one missing)
  for (let i = 0; i < uniqueRanks.length - 2; i++) {
    for (let j = i + 1; j < uniqueRanks.length - 1; j++) {
      for (let k = j + 1; k < uniqueRanks.length; k++) {
        const span = uniqueRanks[k] - uniqueRanks[i];
        if (span === 4) hasGutshot = true;
      }
    }
  }

  // Count outs (simplified)
  let outs = 0;
  if (hasFlushDraw) outs += 9;
  if (hasOESD) outs += 8;
  else if (hasGutshot) outs += 4;

  return { hasFlushDraw, hasOESD, hasGutshot, outs };
}

function decidePostflopAction(
  state: GameState,
  playerIndex: number,
  handCategory: HandCategory,
  boardTexture: BoardTexture,
  drawInfo: DrawInfo,
  actions: any,
  potOdds: number,
  inPosition: boolean,
  personality: BotPersonality,
  rng: Rng,
): AIAction {
  const roll = rng.next();
  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];
  const facingBet = opponent.bet > player.bet;

  // Calculate chip lead advantage - scale aggression with stack size
  const stackRatio = player.stack / opponent.stack;
  const chipLeadBonus =
    stackRatio > 1.3 ? 0.15 : stackRatio > 1.1 ? 0.08 : 0; // More aggressive with chip lead
  const adjustedAggression = Math.min(
    1.0,
    personality.aggression + chipLeadBonus,
  );
  const adjustedBluff = Math.min(
    1.0,
    personality.bluffFactor + chipLeadBonus,
  );

  // ============ MONSTER HANDS ============
  if (handCategory === "monster") {
    if (facingBet) {
      // Rarely slow-play, mostly raise big
      if (roll < 0.15 && state.street !== "River") {
        // Less slow-playing
        return { type: "call" };
      }
      if (actions.canRaise) {
        return {
          type: "raise",
          amount: calculateBetSize(
            state,
            "large",
            boardTexture,
          ),
        };
      }
      return { type: "call" };
    } else {
      // Almost always bet for value - no more check-traps!
      if (actions.canBet && roll < 0.95) {
        // 95% bet vs 85%
        return {
          type: "raise",
          amount: calculateBetSize(
            state,
            "large",
            boardTexture,
          ),
        };
      }
      if (actions.canCheck) return { type: "check" };
    }
  }

  // ============ STRONG HANDS ============
  if (handCategory === "strong") {
    if (facingBet) {
      // Very aggressive raising with strong hands
      if (actions.canRaise && roll < 0.75 * adjustedAggression) {
        // 75% vs 60%
        return {
          type: "raise",
          amount: calculateBetSize(
            state,
            "medium",
            boardTexture,
          ),
        };
      }
      // Call otherwise - almost never fold strong hands
      return { type: "call" };
    } else {
      // BET BET BET - no more passive checking!
      if (actions.canBet && roll < 0.9 * adjustedAggression) {
        // 90% vs 70%
        return {
          type: "raise",
          amount: calculateBetSize(
            state,
            "medium",
            boardTexture,
          ),
        };
      }
      if (actions.canCheck) return { type: "check" };
    }
  }

  // ============ MEDIUM HANDS ============
  if (handCategory === "medium") {
    if (facingBet) {
      // More aggressive bluff-raising
      if (actions.canRaise && roll < 0.25 * adjustedBluff) {
        return {
          type: "raise",
          amount: calculateBetSize(
            state,
            "medium",
            boardTexture,
          ),
        };
      }

      // Defend enough to not be exploitable - call frequency based on pot odds
      // With small bets (good pot odds), defend more liberally
      if (potOdds < 0.35) {
        // Small to medium bets
        // Defend ~60-70% of medium hands
        if (roll < 0.65) {
          return { type: "call" };
        }
      } else if (potOdds < 0.5) {
        // Larger bets
        // Defend ~40% of medium hands
        if (roll < 0.4) {
          return { type: "call" };
        }
      } else {
        // Very large bets
        // Defend ~20% of medium hands
        if (roll < 0.2) {
          return { type: "call" };
        }
      }

      return { type: "fold" };
    } else {
      // More aggressive betting with marginal hands
      if (actions.canBet && roll < 0.55 * adjustedAggression) {
        // 55% vs 30%
        return {
          type: "raise",
          amount: calculateBetSize(
            state,
            "small",
            boardTexture,
          ),
        };
      }
      if (actions.canCheck) return { type: "check" };
    }
  }

  // ============ DRAWING HANDS ============
  if (handCategory === "draw") {
    if (facingBet) {
      // Calculate if we have correct odds
      const impliedOdds = potOdds * 0.75;
      const requiredEquity = impliedOdds;
      const ourEquity = (drawInfo.outs * 2) / 47;

      // MUCH more semi-bluff raising with good draws
      if (
        actions.canRaise &&
        roll < 0.45 * adjustedBluff &&
        (inPosition || state.street !== "River")
      ) {
        return {
          type: "raise",
          amount: calculateBetSize(
            state,
            "medium",
            boardTexture,
          ),
        };
      }

      // Call with reasonable odds - be more liberal to defend against bluffs
      if (ourEquity > requiredEquity * 0.85) {
        // Slightly looser than 1:1
        return { type: "call" };
      }

      // Even with marginal odds, call some % to not be exploitable
      if (ourEquity > requiredEquity * 0.6 && roll < 0.35) {
        return { type: "call" };
      }

      return { type: "fold" };
    } else {
      // AGGRESSIVE semi-bluff betting
      if (actions.canBet && roll < 0.7 * adjustedBluff) {
        return {
          type: "raise",
          amount: calculateBetSize(
            state,
            "medium",
            boardTexture,
          ),
        };
      }
      if (actions.canCheck) return { type: "check" };
    }
  }

  // ============ AIR / WEAK HANDS ============
  if (facingBet) {
    // Bluff-raise occasionally with air in good spots
    if (
      actions.canRaise &&
      roll < 0.15 * adjustedBluff &&
      inPosition &&
      boardTexture === "wet"
    ) {
      return {
        type: "raise",
        amount: calculateBetSize(state, "large", boardTexture),
      };
    }

    // Bluff-catch enough to not be exploitable - especially on river
    // Small bets deserve more bluff-catching
    let bluffCatchFrequency = 0.1; // Base 10%

    if (state.street === "River") {
      // On river, need to defend more to prevent exploitable folds
      if (potOdds < 0.25)
        bluffCatchFrequency = 0.25; // Small river bets: catch 25%
      else if (potOdds < 0.4)
        bluffCatchFrequency = 0.15; // Medium river bets: catch 15%
      else bluffCatchFrequency = 0.08; // Large river bets: catch 8%
    } else {
      // Earlier streets - catch less with pure air
      if (potOdds < 0.3) bluffCatchFrequency = 0.12;
    }

    if (roll < bluffCatchFrequency * personality.riskTolerance) {
      return { type: "call" };
    }

    // FOLD air to bets most of the time - but not always!
    return { type: "fold" };
  } else {
    // BLUFF MUCH MORE - continuation betting and barrel bluffing
    let bluffFreq = 0.6; // Base bluff frequency - way up from 0.25-0.4

    // Increase bluff frequency on scary boards
    if (boardTexture === "wet") bluffFreq = 0.75;
    if (boardTexture === "semi-connected") bluffFreq = 0.68;

    // Increase bluff frequency on later streets (barrel bluffs)
    if (state.street === "Turn") bluffFreq *= 1.15;
    if (state.street === "River") bluffFreq *= 1.2;

    // More aggressive in position
    if (inPosition) bluffFreq *= 1.1;

    if (actions.canBet && roll < bluffFreq * adjustedBluff) {
      return {
        type: "raise",
        amount: calculateBetSize(state, "medium", boardTexture),
      };
    }
    if (actions.canCheck) return { type: "check" };
  }

  // Default fallback
  if (actions.canCheck) return { type: "check" };
  return { type: "fold" };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateRaiseSize(
  state: GameState,
  intent: "value" | "bluff",
  multiplier: number,
): number {
  const actions = getValidActions(state);
  const baseRaise = state.bigBlind * multiplier;
  const raiseAmount = Math.max(actions.minRaise, baseRaise);
  return Math.min(raiseAmount, actions.maxRaise);
}

function calculateBetSize(
  state: GameState,
  size: "small" | "medium" | "large",
  boardTexture: BoardTexture,
): number {
  const actions = getValidActions(state);
  const pot = state.pot;

  let betPercent: number;
  switch (size) {
    case "small":
      betPercent = boardTexture === "dry" ? 0.33 : 0.4;
      break;
    case "medium":
      betPercent = boardTexture === "dry" ? 0.5 : 0.65;
      break;
    case "large":
      betPercent = boardTexture === "dry" ? 0.75 : 1.0;
      break;
  }

  const betSize = Math.floor(pot * betPercent);
  const minBet = actions.canBet
    ? state.bigBlind
    : actions.minRaise;
  const finalBet = Math.max(minBet, betSize);

  return Math.min(finalBet, actions.maxRaise);
}

function isInPosition(
  state: GameState,
  playerIndex: number,
): boolean {
  // Post-flop: button is in position
  return state.players[playerIndex].isButton;
}

function getPairRank(description: string): number {
  // Extract pair rank from description like "Pair of Aces"
  const match = description.match(/Pair of (\w+)/);
  if (match) {
    const rankName = match[1];
    const rankMap: Record<string, number> = {
      Aces: 12,
      Kings: 11,
      Queens: 10,
      Jacks: 9,
      Tens: 8,
      Nines: 7,
      Eights: 6,
      Sevens: 5,
      Sixes: 4,
      Fives: 3,
      Fours: 2,
      Threes: 1,
      Twos: 0,
      Deuces: 0,
    };
    return rankMap[rankName] || 0;
  }
  return 0;
}

function getHighCardRank(cards: Card[]): number {
  return Math.max(...cards.map((c) => RANKS.indexOf(c.rank)));
}

function getKickerStrength(
  holeCards: Card[],
  pairRank: number,
): number {
  const ranks = holeCards.map((c) => RANKS.indexOf(c.rank));
  // Return the rank that's not the pair
  return ranks[0] === pairRank ? ranks[1] : ranks[0];
}
