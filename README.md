
# Poker Arena Web App UI

Poker Arena is a heads-up Texas Hold'em UI with a headless, deterministic engine and bot-vs-bot simulations. The UI is focused on fast multi-table play, hand history, and bot competitions.

## Features

- Heads-up Texas Hold'em engine (seedable RNG)
- Bot registry with easy plug-in strategy interface
- Multi-table simulation grid (up to 10x10)
- Hand history with per-table columns and expandable details
- Dev checks screen with engine edge-case tests

## Getting started

### Install

```bash
npm i
```

### Run dev server

```bash
npm run dev
```

## Project structure

- `src/engine/` — headless poker engine and AI logic
- `src/engine/bots/` — bot registry + bot implementations + docs
- `src/app/` — UI components and screens

## Bots

Bots are simple functions with the signature:

```
(state, playerIndex, rng) => action
```

See `src/engine/bots/README.md` for a full guide and template.

## Multi-table simulation

In the lobby, set the number of tables (perfect squares up to 100) and simulation speed. Multi-table mode requires both players to be AI.

## Dev checks

In dev builds, open the **Dev Checks** screen from the lobby to run engine validations (effective stack, heads-up edge cases).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — build for production
  