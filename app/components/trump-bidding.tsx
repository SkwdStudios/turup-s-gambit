import React from "react";
import { Suit } from "@/app/types/game";

interface TrumpBiddingProps {
  onVote: (suit: Suit) => void;
  userVote: Suit | null;
  votingComplete: boolean;
}

export function TrumpBidding({
  onVote,
  userVote,
  votingComplete,
}: TrumpBiddingProps): React.ReactElement {
  return <div className="trump-bidding" />;
}
