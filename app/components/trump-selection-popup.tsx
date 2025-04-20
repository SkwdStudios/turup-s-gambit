import React from "react";
import { Suit, Card } from "@/app/types/game";

interface TrumpSelectionPopupProps {
  onVote: (suit: Suit) => void;
  userVote: Suit | null;
  votingComplete: boolean;
  playerHand: Array<{
    id: number;
    suit: Suit;
    value: string;
  }>;
  isOpen: boolean;
  isCurrentUserHost: boolean;
}

export function TrumpSelectionPopup({
  onVote,
  userVote,
  votingComplete,
  playerHand,
  isOpen,
  isCurrentUserHost,
}: TrumpSelectionPopupProps) {
  // ... existing code ...
}
