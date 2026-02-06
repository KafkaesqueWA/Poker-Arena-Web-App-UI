import { Card, RANKS, SUITS } from "./types";
import { evaluateHand, compareHands } from "./pokerEngine";

/**
 * Calculates the relative hand strength by comparing our hand
 * against all possible opponent two-card combinations.
 * Returns a value between 0 and 1, where 1 = nuts, 0 = worst possible hand.
 */
export function calculateHandStrength(
  ourCards: Card[],
  communityCards: Card[],
): number {
  const ourHand = evaluateHand([
    ...ourCards,
    ...communityCards,
  ]);

  // Get all cards that are not in our hand or on the board (available to opponent)
  const unavailableCards = [...ourCards, ...communityCards];
  const availableCards = getAllPossibleCards().filter(
    (card) =>
      !unavailableCards.some(
        (unavail) =>
          unavail.rank === card.rank &&
          unavail.suit === card.suit,
      ),
  );

  let wins = 0;
  let ties = 0;
  let total = 0;

  // Check all possible opponent two-card combinations
  for (let i = 0; i < availableCards.length; i++) {
    for (let j = i + 1; j < availableCards.length; j++) {
      const oppCards = [availableCards[i], availableCards[j]];
      const oppHand = evaluateHand([
        ...oppCards,
        ...communityCards,
      ]);

      const result = compareHands(ourHand, oppHand);

      if (result > 0) {
        wins++;
      } else if (result === 0) {
        ties++;
      }

      total++;
    }
  }

  // Return hand strength as a percentile (0-1)
  // Ties count as half a win
  return (wins + ties * 0.5) / total;
}

/**
 * Calculates potential hand strength considering cards yet to come.
 * This is more complex and factors in how our hand might improve.
 */
export function calculatePotentialHandStrength(
  ourCards: Card[],
  communityCards: Card[],
  street: "Flop" | "Turn" | "River",
): {
  current: number;
  potential: number;
  negative: number;
} {
  const currentStrength = calculateHandStrength(
    ourCards,
    communityCards,
  );

  // On the river, there's no potential
  if (street === "River" || communityCards.length === 5) {
    return {
      current: currentStrength,
      potential: 0,
      negative: 0,
    };
  }

  const unavailableCards = [...ourCards, ...communityCards];
  const availableCards = getAllPossibleCards().filter(
    (card) =>
      !unavailableCards.some(
        (unavail) =>
          unavail.rank === card.rank &&
          unavail.suit === card.suit,
      ),
  );

  let ahead = 0;
  let tied = 0;
  let behind = 0;

  let improveWhenBehind = 0;
  let improveWhenTied = 0;
  let worsensWhenAhead = 0;

  const ourCurrentHand = evaluateHand([
    ...ourCards,
    ...communityCards,
  ]);

  // Sample opponent holdings
  for (let i = 0; i < availableCards.length && i < 50; i += 2) {
    for (
      let j = i + 1;
      j < availableCards.length && j < 51;
      j += 2
    ) {
      const oppCards = [availableCards[i], availableCards[j]];
      const oppCurrentHand = evaluateHand([
        ...oppCards,
        ...communityCards,
      ]);

      const currentComparison = compareHands(
        ourCurrentHand,
        oppCurrentHand,
      );

      if (currentComparison > 0) ahead++;
      else if (currentComparison === 0) tied++;
      else behind++;

      // Now simulate future cards (sample to avoid exponential complexity)
      let futureImprove = 0;
      let futureWorsen = 0;
      let futureTotal = 0;

      for (
        let k = 0;
        k < availableCards.length && futureTotal < 20;
        k++
      ) {
        const futureCard = availableCards[k];
        if (oppCards.includes(futureCard)) continue;

        const futureCommunity = [...communityCards, futureCard];
        const ourFutureHand = evaluateHand([
          ...ourCards,
          ...futureCommunity,
        ]);
        const oppFutureHand = evaluateHand([
          ...oppCards,
          ...futureCommunity,
        ]);

        const futureComparison = compareHands(
          ourFutureHand,
          oppFutureHand,
        );

        if (currentComparison <= 0 && futureComparison > 0) {
          futureImprove++;
        } else if (
          currentComparison > 0 &&
          futureComparison <= 0
        ) {
          futureWorsen++;
        }

        futureTotal++;
      }

      if (currentComparison < 0 && futureTotal > 0) {
        improveWhenBehind += futureImprove / futureTotal;
      } else if (currentComparison === 0 && futureTotal > 0) {
        improveWhenTied += futureImprove / futureTotal;
      } else if (currentComparison > 0 && futureTotal > 0) {
        worsensWhenAhead += futureWorsen / futureTotal;
      }
    }
  }

  const totalSamples = ahead + tied + behind || 1;
  const potential =
    (ahead > 0 ? 0 : improveWhenBehind / behind || 0) +
    (improveWhenTied / tied || 0) * 0.5;
  const negative = ahead > 0 ? worsensWhenAhead / ahead : 0;

  return {
    current: currentStrength,
    potential: potential,
    negative: negative,
  };
}

/**
 * Categorizes hand strength into buckets for easier decision making
 */
export function categorizeHandStrength(
  strength: number,
):
  | "nuts"
  | "very-strong"
  | "strong"
  | "medium"
  | "weak"
  | "very-weak" {
  if (strength >= 0.95) return "nuts";
  if (strength >= 0.8) return "very-strong";
  if (strength >= 0.6) return "strong";
  if (strength >= 0.4) return "medium";
  if (strength >= 0.2) return "weak";
  return "very-weak";
}

/**
 * Helper to generate all 52 cards
 */
function getAllPossibleCards(): Card[] {
  const cards: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ rank, suit });
    }
  }

  return cards;
}

/**
 * Quick helper to determine if we have the absolute nuts
 */
export function isNuts(
  ourCards: Card[],
  communityCards: Card[],
): boolean {
  return (
    calculateHandStrength(ourCards, communityCards) >= 0.999
  );
}

/**
 * Calculate effective hand strength considering board texture and opponent ranges
 */
export function calculateEffectiveHandStrength(
  ourCards: Card[],
  communityCards: Card[],
  street: "Preflop" | "Flop" | "Turn" | "River",
): number {
  if (street === "Preflop") {
    // For preflop, we can't use board-based calculation
    // Return a simplified equity estimate
    return estimatePreflopEquity(ourCards);
  }

  const rawStrength = calculateHandStrength(
    ourCards,
    communityCards,
  );

  // On later streets, adjust for board texture dangers
  const boardTexture = analyzeBoardDanger(communityCards);

  // If we have a very strong hand on a dangerous board, it's actually not as strong
  // If we have a marginal hand on a dry board, it's relatively stronger
  let adjustment = 0;

  if (boardTexture === "very-dangerous") {
    adjustment = -0.05; // Decrease value on scary boards
  } else if (boardTexture === "dry") {
    adjustment = +0.05; // Increase value on dry boards
  }

  return Math.max(0, Math.min(1, rawStrength + adjustment));
}

/**
 * Estimate preflop equity based on hand quality
 */
function estimatePreflopEquity(cards: Card[]): number {
  const [c1, c2] = cards;
  const rank1 = RANKS.indexOf(c1.rank);
  const rank2 = RANKS.indexOf(c2.rank);
  const highRank = Math.max(rank1, rank2);
  const lowRank = Math.min(rank1, rank2);
  const suited = c1.suit === c2.suit;
  const pair = rank1 === rank2;
  const gap = highRank - lowRank;

  // Rough equity estimates for heads-up
  if (pair) {
    // Pocket pairs: AA = 85%, 22 = 52%
    return 0.52 + (highRank / 12) * 0.33;
  }

  // High cards
  const avgRank = (highRank + lowRank) / 2;
  let equity = 0.45 + (avgRank / 12) * 0.25;

  // Suited bonus
  if (suited) equity += 0.03;

  // Connectedness bonus
  if (gap <= 1) equity += 0.02;
  else if (gap <= 3) equity += 0.01;

  // Big card bonus
  if (highRank >= 10) equity += 0.05;
  if (highRank >= 12) equity += 0.05;

  return Math.max(0.3, Math.min(0.85, equity));
}

/**
 * Analyze how dangerous the board is
 */
function analyzeBoardDanger(
  communityCards: Card[],
): "dry" | "moderate" | "dangerous" | "very-dangerous" {
  if (communityCards.length < 3) return "dry";

  const ranks = communityCards
    .map((c) => RANKS.indexOf(c.rank))
    .sort((a, b) => b - a);
  const suits = communityCards.map((c) => c.suit);

  let dangerScore = 0;

  // Check for flush draws/flushes
  const suitCounts: Record<string, number> = {};
  suits.forEach(
    (s) => (suitCounts[s] = (suitCounts[s] || 0) + 1),
  );
  const maxSuitCount = Math.max(...Object.values(suitCounts));

  if (maxSuitCount >= 4)
    dangerScore += 3; // Flush possible
  else if (maxSuitCount >= 3) dangerScore += 2; // Flush draw

  // Check for straight draws/straights
  const maxGap = ranks[0] - ranks[ranks.length - 1];
  if (maxGap <= 4 && communityCards.length >= 3) {
    dangerScore += 2; // Straight possible
  }

  // Check for pairs/trips on board
  const rankCounts: Record<number, number> = {};
  ranks.forEach(
    (r) => (rankCounts[r] = (rankCounts[r] || 0) + 1),
  );
  const maxRankCount = Math.max(...Object.values(rankCounts));

  if (maxRankCount >= 3)
    dangerScore += 2; // Trips on board
  else if (maxRankCount >= 2) dangerScore += 1; // Pair on board

  // High cards make board more dangerous
  const highCards = ranks.filter((r) => r >= 10).length;
  dangerScore += Math.floor(highCards / 2);

  if (dangerScore >= 5) return "very-dangerous";
  if (dangerScore >= 3) return "dangerous";
  if (dangerScore >= 1) return "moderate";
  return "dry";
}
