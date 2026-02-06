import { getAIAction } from "../aiPlayer";
import { BotDefinition } from "./types";

export const basicBot: BotDefinition = {
  id: "basic",
  name: "Basic Bot",
  decide: (state, playerIndex, rng) =>
    getAIAction(state, playerIndex, rng),
};
