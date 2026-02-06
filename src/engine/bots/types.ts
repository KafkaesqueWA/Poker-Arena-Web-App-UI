import { GameState } from "../types";
import { Rng } from "../rng";

export type BotAction =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; amount: number };

export type BotFn = (
  state: GameState,
  playerIndex: number,
  rng: Rng,
) => BotAction;

export interface BotDefinition {
  id: string;
  name: string;
  decide: BotFn;
}
