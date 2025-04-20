import React from "react";
import { GameState } from "@/app/types/game";

interface GameInfoProps {
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
  isCurrentUserHost: boolean;
}

export function GameInfo({
  gameMode,
  players,
  gameState,
  gameStatus,
  isCurrentUserHost,
}: GameInfoProps): React.ReactElement {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Game Info</h2>
      <p>Mode: {gameMode}</p>
      <p>Status: {gameStatus}</p>
      <p>Players: {players.length}/4</p>
      {isCurrentUserHost && <p className="text-green-500">You are the host</p>}
    </div>
  );
}
