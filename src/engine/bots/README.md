## Bot Development Guide

This folder contains all poker bots. Bots are plain functions that decide actions given game state.

### Bot API

Each bot exports a `BotDefinition` with this shape:

- `id`: unique string identifier
- `name`: display name
- `decide(state, playerIndex, rng) => action`

The `action` must be one of:

- `{ type: "fold" }`
- `{ type: "check" }`
- `{ type: "call" }`
- `{ type: "raise", amount: number }`

### Example

```ts
import { BotDefinition } from "./types";

export const myBot: BotDefinition = {
  id: "mybot",
  name: "My Bot",
  decide: (state, playerIndex, rng) => {
    // simple example: always check if possible, otherwise call
    const opponent =
      state.players[(playerIndex + 1) % 2];
    const canCheck =
      state.players[playerIndex].bet === opponent.bet;
    return canCheck ? { type: "check" } : { type: "call" };
  },
};
```

### Register your bot

1. Create a new file in `src/engine/bots`, e.g. `myBot.ts`.
2. Export a `BotDefinition`.
3. Add it to `botRegistry` in `src/engine/bots/index.ts`.

### Notes

- Keep bots deterministic by using the provided `rng` for randomness.
- Avoid UI imports. Bots should stay headless.
