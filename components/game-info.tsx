"use client";

import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";

interface GameInfoProps {
  roomId: string;
}

export function GameInfo({ roomId }: GameInfoProps) {
  const { user } = useAuthStore();
  const [isSharing, setIsSharing] = useState(false);

  const handleShareGame = () => {
    setIsSharing(true);
    const url = `${window.location.origin}/game/${roomId}`;
    navigator.clipboard.writeText(url);

    // Show success state briefly
    setTimeout(() => {
      setIsSharing(false);
    }, 1500);
  };

  return (
    <div>
      <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border border-primary/30">
        <h3 className="text-lg font-medieval text-primary mb-4">
          Game Details
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Room ID</p>
            <p className="font-medieval">{roomId}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Player</p>
            <p className="font-medieval">{user?.name || "Guest"}</p>
          </div>
        </div>
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
        </div>
      </div>
    </div>
  );
}
