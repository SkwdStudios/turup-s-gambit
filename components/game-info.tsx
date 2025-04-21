"use client";

import { useAuthStore } from "@/stores/authStore";

interface GameInfoProps {
  roomId: string;
}

export function GameInfo({ roomId }: GameInfoProps) {
  const { user } = useAuthStore();

  return (
    <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border border-primary/30">
      <h3 className="text-lg font-medieval text-primary mb-4">
        Game Information
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
    </div>
  );
}
