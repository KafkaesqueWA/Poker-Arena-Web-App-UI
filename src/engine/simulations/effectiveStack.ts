import {
  GameSettings,
  initializeGame,
  startNewHand,
  playerRaise,
  getValidActions,
} from "../gameState";
import { createSeededRng } from "../rng";

export interface EffectiveStackCheckResult {
  name: string;
  passed: boolean;
  details: string;
}

export function runEffectiveStackChecks(): EffectiveStackCheckResult[] {
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

  const scenario1 = { ...baseState };
  scenario1.players = [
    { ...scenario1.players[0], stack: 100, bet: 0 },
    { ...scenario1.players[1], stack: 40, bet: 0 },
  ];
  scenario1.pot = 0;
  scenario1.currentPlayerIndex = 0;
  scenario1.lastRaiseAmount = scenario1.bigBlind;

  const raised1 = playerRaise(scenario1, 100);
  const expectedBet1 = 40;
  const result1 =
    raised1.players[0].bet === expectedBet1 &&
    raised1.players[0].stack === 60 &&
    raised1.pot === expectedBet1;

  const scenario2 = { ...baseState };
  scenario2.players = [
    { ...scenario2.players[0], stack: 100, bet: 0 },
    { ...scenario2.players[1], stack: 30, bet: 10 },
  ];
  scenario2.pot = 10;
  scenario2.currentPlayerIndex = 0;
  scenario2.lastRaiseAmount = scenario2.bigBlind;

  const actions2 = getValidActions(scenario2);
  const raised2 = playerRaise(scenario2, 80);
  const expectedBet2 = 40; // opponent bet (10) + opponent stack (30)
  const result2 =
    actions2.maxRaise === expectedBet2 &&
    raised2.players[0].bet === expectedBet2 &&
    raised2.players[0].stack === 60 &&
    raised2.pot === 50;

  return [
    {
      name: "Cap all-in to effective stack",
      passed: result1,
      details: `expected bet ${expectedBet1}, got ${raised1.players[0].bet}`,
    },
    {
      name: "Max raise respects effective stack",
      passed: result2,
      details: `expected maxRaise ${expectedBet2}, got ${actions2.maxRaise}`,
    },
  ];
}
