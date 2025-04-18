"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function GameControlsSkeleton() {
  return (
    <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border border-primary/30">
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
