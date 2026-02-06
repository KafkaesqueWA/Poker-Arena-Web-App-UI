import { Card, Rank, Suit, RANKS, SUITS } from "./types";
import { Rng, createMathRandomRng } from "./rng";

// Hand rankings
export enum HandRank {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9,
}

export interface EvaluatedHand {
  rank: HandRank;
  value: number;
  description: string;
  cards: Card[];
}

// Create a shuffled deck
export function createDeck(rng: Rng = createMathRandomRng()): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return shuffleDeck(deck, rng);
}

// Fisher-Yates shuffle
export function shuffleDeck(
  deck: Card[],
  rng: Rng = createMathRandomRng(),
): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Convert rank to numerical value (2=2, J=11, Q=12, K=13, A=14)
function rankValue(rank: Rank): number {
  const rankIndex = RANKS.indexOf(rank);
  return rankIndex + 2;
}

// Evaluate a poker hand (5-7 cards)
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    return {
      rank: HandRank.HighCard,
      value: 0,
      description: "Incomplete hand",
      cards: [],
    };
  }

  // Get all possible 5-card combinations
  const combinations = get5CardCombinations(cards);
  let bestHand: EvaluatedHand | null = null;

  for (const combo of combinations) {
    const evaluated = evaluate5CardHand(combo);
    if (!bestHand || evaluated.value > bestHand.value) {
      bestHand = evaluated;
    }
  }

  return bestHand!;
}

// Get all 5-card combinations from 5-7 cards
function get5CardCombinations(cards: Card[]): Card[][] {
  if (cards.length === 5) return [cards];
  if (cards.length === 6) {
    const combos: Card[][] = [];
    for (let i = 0; i < 6; i++) {
      combos.push(cards.filter((_, idx) => idx !== i));
    }
    return combos;
  }
  if (cards.length === 7) {
    const combos: Card[][] = [];
    for (let i = 0; i < 7; i++) {
      for (let j = i + 1; j < 7; j++) {
        combos.push(cards.filter((_, idx) => idx !== i && idx !== j));
      }
    }
    return combos;
  }
  return [];
}

// Evaluate exactly 5 cards
function evaluate5CardHand(cards: Card[]): EvaluatedHand {
  const ranks = cards.map((c) => c.rank);
  const suits = cards.map((c) => c.suit);

  // Count rank occurrences - use the actual rank values
  const rankCountMap = new Map<number, number>();
  const rankValueArray: number[] = [];

  for (const rank of ranks) {
    const rv = rankValue(rank);
    rankValueArray.push(rv);
    rankCountMap.set(rv, (rankCountMap.get(rv) || 0) + 1);
  }

  // Sort rank values descending
  const sortedRankValues = [...rankValueArray].sort(
    (a, b) => b - a,
  );

  // Group ranks by count, then by rank value
  // First sort by count (descending), then by rank value (descending)
  const rankGroups = Array.from(rankCountMap.entries()).sort(
    (a, b) => {
      // Sort by count first (descending)
      if (b[1] !== a[1]) return b[1] - a[1];
      // Then by rank value (descending)
      return b[0] - a[0];
    },
  );

  const counts = rankGroups.map(([_, count]) => count);
  const ranksOrderedByCount = rankGroups.map(([rank, _]) => rank);

  // Check for flush
  const isFlush = suits.every((s) => s === suits[0]);

  // Check for straight
  const isStraight = checkStraight(sortedRankValues);
  const isWheelStraight = checkWheelStraight(sortedRankValues); // A-2-3-4-5

  // Royal Flush (A-K-Q-J-10 suited)
  if (
    isFlush &&
    isStraight &&
    sortedRankValues[0] === 14 &&
    sortedRankValues[1] === 13
  ) {
    return {
      rank: HandRank.RoyalFlush,
      value: 900000000,
      description: "Royal Flush",
      cards,
    };
  }

  // Straight Flush
  if (isFlush && (isStraight || isWheelStraight)) {
    const highCard = isWheelStraight ? 5 : sortedRankValues[0];
    return {
      rank: HandRank.StraightFlush,
      value: 800000000 + highCard,
      description: "Straight Flush",
      cards,
    };
  }

  // Four of a Kind
  if (counts[0] === 4) {
    const quadRank = ranksOrderedByCount[0];
    const kicker = ranksOrderedByCount[1];
    return {
      rank: HandRank.FourOfAKind,
      value: 700000000 + quadRank * 100 + kicker,
      description: `Four ${getRankName(quadRank)}s`,
      cards,
    };
  }

  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    const tripRank = ranksOrderedByCount[0];
    const pairRank = ranksOrderedByCount[1];
    return {
      rank: HandRank.FullHouse,
      value: 600000000 + tripRank * 100 + pairRank,
      description: `Full House, ${getRankName(tripRank)}s over ${getRankName(pairRank)}s`,
      cards,
    };
  }

  // Flush
  if (isFlush) {
    let value = 500000000;
    for (let i = 0; i < sortedRankValues.length; i++) {
      value += sortedRankValues[i] * Math.pow(15, 4 - i);
    }
    return {
      rank: HandRank.Flush,
      value,
      description: `Flush, ${getRankName(sortedRankValues[0])} high`,
      cards,
    };
  }

  // Straight
  if (isStraight || isWheelStraight) {
    const highCard = isWheelStraight ? 5 : sortedRankValues[0];
    return {
      rank: HandRank.Straight,
      value: 400000000 + highCard,
      description: `Straight, ${getRankName(highCard)} high`,
      cards,
    };
  }

  // Three of a Kind
  if (counts[0] === 3) {
    const tripRank = ranksOrderedByCount[0];
    const kicker1 = ranksOrderedByCount[1];
    const kicker2 = ranksOrderedByCount[2];
    return {
      rank: HandRank.ThreeOfAKind,
      value:
        300000000 + tripRank * 10000 + kicker1 * 100 + kicker2,
      description: `Three ${getRankName(tripRank)}s`,
      cards,
    };
  }

  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    const highPair = ranksOrderedByCount[0];
    const lowPair = ranksOrderedByCount[1];
    const kicker = ranksOrderedByCount[2];
    return {
      rank: HandRank.TwoPair,
      value:
        200000000 + highPair * 10000 + lowPair * 100 + kicker,
      description: `Two Pair, ${getRankName(highPair)}s and ${getRankName(lowPair)}s`,
      cards,
    };
  }

  // Pair
  if (counts[0] === 2) {
    const pairRank = ranksOrderedByCount[0];
    const kicker1 = ranksOrderedByCount[1];
    const kicker2 = ranksOrderedByCount[2];
    const kicker3 = ranksOrderedByCount[3];
    return {
      rank: HandRank.Pair,
      value:
        100000000 +
        pairRank * 1000000 +
        kicker1 * 10000 +
        kicker2 * 100 +
        kicker3,
      description: `Pair of ${getRankName(pairRank)}s`,
      cards,
    };
  }

  // High Card
  let value = 0;
  for (let i = 0; i < sortedRankValues.length; i++) {
    value += sortedRankValues[i] * Math.pow(15, 4 - i);
  }
  return {
    rank: HandRank.HighCard,
    value,
    description: `${getRankName(sortedRankValues[0])} high`,
    cards,
  };
}

function checkStraight(sortedRankValues: number[]): boolean {
  // Remove duplicates and sort
  const unique = Array.from(new Set(sortedRankValues)).sort(
    (a, b) => b - a,
  );

  // Need exactly 5 unique cards for a straight
  if (unique.length !== 5) return false;

  // Check if consecutive
  for (let i = 0; i < unique.length - 1; i++) {
    if (unique[i] - unique[i + 1] !== 1) {
      return false;
    }
  }
  return true;
}

function checkWheelStraight(sortedRankValues: number[]): boolean {
  // A-2-3-4-5 (Ace low straight)
  const unique = Array.from(new Set(sortedRankValues)).sort(
    (a, b) => b - a,
  );

  // Must have exactly these 5 cards
  if (unique.length !== 5) return false;

  return (
    unique[0] === 14 &&
    unique[1] === 5 &&
    unique[2] === 4 &&
    unique[3] === 3 &&
    unique[4] === 2
  );
}

function getRankName(value: number): string {
  const rank = RANKS[value - 2];
  if (rank === "A") return "Ace";
  if (rank === "K") return "King";
  if (rank === "Q") return "Queen";
  if (rank === "J") return "Jack";
  return rank;
}

// Compare two hands (returns positive if hand1 wins, negative if hand2 wins, 0 for tie)
export function compareHands(
  hand1: EvaluatedHand,
  hand2: EvaluatedHand,
): number {
  return hand1.value - hand2.value;
}

// Format card for display
export function formatCard(card: Card): string {
  const suitSymbols: Record<Suit, string> = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };
  return `${card.rank}${suitSymbols[card.suit]}`;
}
