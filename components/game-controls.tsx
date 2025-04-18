"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share } from "lucide-react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";

interface GameControlsProps {
  roomId: string;
}

export function GameControls({ roomId }: GameControlsProps) {
  const router = useRouter();
  const [isSharing, setIsSharing] = useState(false);
  const [isCreatingNewGame, setIsCreatingNewGame] = useState(false);

  const handleShareGame = () => {
    setIsSharing(true);
    const url = `${window.location.origin}/game/${roomId}`;
    navigator.clipboard.writeText(url);

    // Show success state briefly
    setTimeout(() => {
      setIsSharing(false);
    }, 1500);
  };

  const handleNewGame = () => {
    setIsCreatingNewGame(true);
    router.push("/game");
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border border-primary/30">
      <h3 className="text-lg font-medieval text-primary mb-4">Game Controls</h3>
      <div className="space-y-4">
        <Button
          variant="outline"
          className="w-full medieval-button flex items-center gap-2"
          onClick={handleShareGame}
          disabled={isSharing}
        >
          {isSharing ? (
            <>
              <LoadingSpinner size="sm" />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                Copied!
              </motion.span>
            </>
          ) : (
            <>
              <Share size={16} />
              <span>Share Game</span>
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full medieval-button flex items-center justify-center gap-2"
          onClick={handleNewGame}
          disabled={isCreatingNewGame}
        >
          {isCreatingNewGame ? (
            <>
              <LoadingSpinner size="sm" />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                Creating...
              </motion.span>
            </>
          ) : (
            "New Game"
          )}
        </Button>
      </div>
    </div>
  );
}
