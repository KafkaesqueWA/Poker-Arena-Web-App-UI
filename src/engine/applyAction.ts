import { Action, EngineEvent, GameState } from "./types";
import {
  playerCall,
  playerCheck,
  playerFold,
  playerRaise,
  startNewHand,
} from "./gameState";
import { Rng, createMathRandomRng } from "./rng";

export function applyAction(
  state: GameState,
  action: Action,
  rng: Rng = createMathRandomRng(),
): { state: GameState; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  const prevStreet = state.street;
  const prevCommunityCount = state.communityCards.length;
  const actingPlayerIndex = state.currentPlayerIndex;

  let nextState: GameState;

  switch (action.type) {
    case "startHand":
      nextState = startNewHand(state, rng);
      events.push({
        type: "handStarted",
        handNumber: nextState.handNumber,
      });
      break;
    case "fold":
      nextState = playerFold(state);
      events.push({
        type: "action",
        action,
        playerIndex: actingPlayerIndex,
      });
      break;
    case "check":
      nextState = playerCheck(state);
      events.push({
        type: "action",
        action,
        playerIndex: actingPlayerIndex,
      });
      break;
    case "call":
      nextState = playerCall(state);
      events.push({
        type: "action",
        action,
        playerIndex: actingPlayerIndex,
      });
      break;
    case "raise":
      nextState = playerRaise(state, action.amount);
      events.push({
        type: "action",
        action,
        playerIndex: actingPlayerIndex,
      });
      break;
    default:
      nextState = state;
  }

  if (nextState.street !== prevStreet) {
    events.push({ type: "street", street: nextState.street });
  }

  if (nextState.communityCards.length > prevCommunityCount) {
    const newCards = nextState.communityCards.slice(
      prevCommunityCount,
    );
    events.push({
      type: "cards",
      street: nextState.street,
      cards: newCards,
    });
  }

  if (nextState.isHandComplete) {
    const reason =
      action.type === "fold"
        ? "fold"
        : nextState.street === "Showdown" &&
            prevStreet !== "River"
          ? "all-in"
          : "showdown";
    events.push({ type: "handComplete", reason });
  }

  return { state: nextState, events };
}
