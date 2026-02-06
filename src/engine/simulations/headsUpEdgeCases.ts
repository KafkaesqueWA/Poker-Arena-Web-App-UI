import {
  Card,
  GameSettings,
  initializeGame,
  startNewHand,
  determineWinner,
  awardPot,
  playerCall,
  playerRaise,
  getValidActions,
} from "../gameState";
import { createSeededRng } from "../rng";

export interface HeadsUpEdgeCaseResult {
  name: string;
  passed: boolean;
  details: string;
}

function card(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

export function runHeadsUpEdgeCaseChecks(): HeadsUpEdgeCaseResult[] {
  const settings: GameSettings = {
    playerName: "P1",
    player2Name: "P2",
    player1Type: "ai",
    player2Type: "ai",
    startingStack: 100,
    smallBlind: 1,
    bigBlind: 2,
  };

  const baseState = startNewHand(
    initializeGame(settings),
    createSeededRng(1),
  );

  // Edge case 1: Wheel straight vs higher straight
  const wheelState = { ...baseState };
  wheelState.communityCards = [
    card("A", "spades"),
    card("3", "hearts"),
    card("4", "clubs"),
    card("5", "diamonds"),
    card("9", "spades"),
  ];
  wheelState.players = [
    {
      ...wheelState.players[0],
      cards: [card("2", "hearts"), card("K", "clubs")],
    },
    {
      ...wheelState.players[1],
      cards: [card("6", "hearts"), card("7", "clubs")],
    },
  ];
  const wheelResult = determineWinner(wheelState);
  const wheelPass = wheelResult.winner === 1;

  // Edge case 2: Board is the nuts (tie)
  const tieState = { ...baseState };
  tieState.communityCards = [
    card("A", "spades"),
    card("K", "spades"),
    card("Q", "spades"),
    card("J", "spades"),
    card("10", "spades"),
  ];
  tieState.players = [
    {
      ...tieState.players[0],
      cards: [card("2", "hearts"), card("3", "clubs")],
    },
    {
      ...tieState.players[1],
      cards: [card("4", "hearts"), card("5", "clubs")],
    },
  ];
  const tieResult = determineWinner(tieState);
  const tiePass = tieResult.winner === null;

  // Edge case 3: Flush tie breaker by kicker
  const flushState = { ...baseState };
  flushState.communityCards = [
    card("A", "hearts"),
    card("9", "hearts"),
    card("5", "hearts"),
    card("2", "hearts"),
    card("K", "clubs"),
  ];
  flushState.players = [
    {
      ...flushState.players[0],
      cards: [card("Q", "hearts"), card("3", "clubs")],
    },
    {
      ...flushState.players[1],
      cards: [card("J", "hearts"), card("4", "clubs")],
    },
  ];
  const flushResult = determineWinner(flushState);
  const flushPass = flushResult.winner === 0;

  // Edge case 4: Effective stack cap on raise
  const capState = { ...baseState };
  capState.players = [
    { ...capState.players[0], stack: 100, bet: 0 },
    { ...capState.players[1], stack: 20, bet: 0 },
  ];
  capState.pot = 0;
  capState.currentPlayerIndex = 0;
  capState.lastRaiseAmount = capState.bigBlind;
  const capRaised = playerRaise(capState, 100);
  const capPass =
    capRaised.players[0].bet === 20 &&
    capRaised.players[0].stack === 80 &&
    capRaised.pot === 20;

  // Edge case 5: Call amount not exceeding stack
  const callState = { ...baseState };
  callState.players = [
    { ...callState.players[0], stack: 5, bet: 0 },
    { ...callState.players[1], stack: 50, bet: 10 },
  ];
  callState.pot = 10;
  callState.currentPlayerIndex = 0;
  const called = playerCall(callState);
  const callPass =
    called.players[0].bet === 5 &&
    called.players[0].stack === 0 &&
    called.pot === 15;

  // Edge case 6: Max raise respects effective stack
  const maxRaiseState = { ...baseState };
  maxRaiseState.players = [
    { ...maxRaiseState.players[0], stack: 100, bet: 0 },
    { ...maxRaiseState.players[1], stack: 30, bet: 10 },
  ];
  maxRaiseState.currentPlayerIndex = 0;
  const maxRaiseActions = getValidActions(maxRaiseState);
  const maxRaisePass = maxRaiseActions.maxRaise === 40;

  // Edge case 7: Split pot odd chip goes to button
  const splitState = { ...baseState };
  splitState.pot = 11;
  splitState.players = [
    { ...splitState.players[0], stack: 50, isButton: true },
    { ...splitState.players[1], stack: 50, isButton: false },
  ];
  const awardedSplit = awardPot(splitState, null);
  const splitPass =
    awardedSplit.players[0].stack === 56 &&
    awardedSplit.players[1].stack === 55;

  return [
    {
      name: "Wheel straight loses to higher straight",
      passed: wheelPass,
      details: `expected winner P2, got ${wheelResult.winner}`,
    },
    {
      name: "Board royal flush is a tie",
      passed: tiePass,
      details: `expected tie, got ${tieResult.winner}`,
    },
    {
      name: "Flush kicker decides winner",
      passed: flushPass,
      details: `expected winner P1, got ${flushResult.winner}`,
    },
    {
      name: "Raise capped to effective stack",
      passed: capPass,
      details: `expected bet 20, got ${capRaised.players[0].bet}`,
    },
    {
      name: "Call capped by caller stack",
      passed: callPass,
      details: `expected bet 5, got ${called.players[0].bet}`,
    },
    {
      name: "Max raise uses effective stack",
      passed: maxRaisePass,
      details: `expected maxRaise 40, got ${maxRaiseActions.maxRaise}`,
    },
    {
      name: "Odd chip goes to button on split",
      passed: splitPass,
      details: `expected stacks 56/55, got ${awardedSplit.players[0].stack}/${awardedSplit.players[1].stack}`,
    },
  ];
}
