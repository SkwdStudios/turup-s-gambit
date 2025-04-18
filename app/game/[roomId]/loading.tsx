import { WaitingRoomSkeleton } from "@/components/waiting-room-skeleton";
import { GameInfoSkeleton } from "@/components/game-info-skeleton";
import { GameControlsSkeleton } from "@/components/game-controls-skeleton";
import { VisualEffects } from "@/components/visual-effects";

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <VisualEffects enableGrain />
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 dark:opacity-30"
          style={{ backgroundImage: "url('/assets/game-table-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <WaitingRoomSkeleton />
        </div>
        <div className="space-y-8">
          <GameInfoSkeleton />
          <GameControlsSkeleton />
        </div>
      </div>
    </div>
  );
}
