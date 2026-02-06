import { BotDefinition } from "./types";

// Copy this file to create a new bot and register it in bots/index.ts.
export const templateBot: BotDefinition = {
  id: "template",
  name: "Template Bot",
  decide: (state, playerIndex, rng) => {
    // Example: always check if possible, otherwise call.
    const opponent =
      state.players[(playerIndex + 1) % 2];
    const canCheck =
      state.players[playerIndex].bet === opponent.bet;
    return canCheck ? { type: "check" } : { type: "call" };
  },
};
