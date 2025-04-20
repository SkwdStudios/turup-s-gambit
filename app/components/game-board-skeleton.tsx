import React from "react";

export function GameBoardSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse bg-gray-200 rounded-lg p-4 h-96">
      <div className="space-y-4">
        <div className="h-8 bg-gray-300 rounded w-1/4"></div>
        <div className="h-32 bg-gray-300 rounded"></div>
        <div className="h-8 bg-gray-300 rounded w-1/2"></div>
      </div>
    </div>
  );
}
