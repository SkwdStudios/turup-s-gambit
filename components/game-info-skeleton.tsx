"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function GameInfoSkeleton() {
  return (
    <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border border-primary/30">
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="space-y-4">
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
    </div>
  );
}
