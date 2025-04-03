"use client";

import { Button } from "@/components/ui/button";
import { Share } from "lucide-react";
import { useRouter } from "next/navigation";

interface GameControlsProps {
  roomId: string;
}

export function GameControls({ roomId }: GameControlsProps) {
  const router = useRouter();

  const handleShareGame = () => {
    const url = `${window.location.origin}/game/${roomId}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border border-primary/30">
      <h3 className="text-lg font-medieval text-primary mb-4">Game Controls</h3>
      <div className="space-y-4">
        <Button
          variant="outline"
          className="w-full medieval-button flex items-center gap-2"
          onClick={handleShareGame}
        >
          <Share size={16} />
          <span>Share Game</span>
        </Button>
        <Button
          variant="outline"
          className="w-full medieval-button"
          onClick={() => router.push("/game")}
        >
          New Game
        </Button>
      </div>
    </div>
  );
}
