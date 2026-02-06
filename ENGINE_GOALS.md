This project is a heads-up Texas Hold’em poker platform.

Core goals:
- The poker engine must be headless and deterministic
- No UI imports inside /engine
- All randomness must be seedable
- Engine must support bot-vs-bot simulation
- GameState is authoritative
- UI is a thin client

Upcoming work:
- Refactor engine to remove UI coupling
- Add seeded RNG
- Add applyAction entrypoint
- Add event logging
- Add bot implementations (chart + mixed strategy)
- Add multi-table simulation and stats

Do not over-engineer. Prioritize clarity and correctness.
