import React from "react";
import { GameState, Card } from "@/app/types/game";

interface GameBoardProps {
  roomId: string;
  gameMode: "classic" | "frenzy";
  players: string[];
  gameState: GameState | null;
  gameStatus:
    | "waiting"
    | "initial_deal"
    | "bidding"
    | "final_deal"
    | "playing"
    | "ended";
  initialCardsDeal: boolean;
  onPlayCard: (card: Card) => void;
  sendMessage: (message: any) => boolean;
}

export function GameBoard({
  roomId,
  gameMode,
  players,
  gameState,
  gameStatus,
  initialCardsDeal,
  onPlayCard,
  sendMessage,
}: GameBoardProps): React.ReactElement {
  return <div className="game-board" />;
}
