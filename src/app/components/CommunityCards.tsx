import React from 'react';
import { Card, CardProps } from './Card';

export interface CommunityCardsProps {
  cards: CardProps[];
  className?: string;
}

export function CommunityCards({ cards, className = '' }: CommunityCardsProps) {
  // Only render actual cards that have been dealt
  return (
    <div className={`flex gap-2 ${className}`}>
      {cards.map((card, idx) => (
        <Card key={idx} {...card} />
      ))}
    </div>
  );
}