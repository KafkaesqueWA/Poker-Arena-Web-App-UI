import { Card } from "../../engine/types";
import { CardProps } from "../components/Card";

export function toCardProps(
  card: Card,
  options?: { faceDown?: boolean },
): CardProps {
  return {
    suit: card.suit,
    rank: card.rank,
    faceDown: options?.faceDown,
  };
}

export function toCardPropsList(
  cards: Card[],
  options?: { faceDown?: boolean },
): CardProps[] {
  return cards.map((card) => toCardProps(card, options));
}
