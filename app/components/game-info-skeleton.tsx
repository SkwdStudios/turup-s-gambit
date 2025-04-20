import React from "react";

export function GameInfoSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse bg-gray-200 rounded-lg p-4">
      <div className="space-y-3">
        <div className="h-6 bg-gray-300 rounded w-1/3"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
      </div>
    </div>
  );
}
