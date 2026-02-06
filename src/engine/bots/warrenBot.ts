import { getAdvancedAIAction } from "../advancedAiPlayer";
import { BotDefinition } from "./types";

export const warrenBot: BotDefinition = {
  id: "warren",
  name: "Warren's bot",
  decide: (state, playerIndex, rng) =>
    getAdvancedAIAction(state, playerIndex, undefined, rng),
};
