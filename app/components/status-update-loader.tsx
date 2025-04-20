import React from "react";

interface StatusUpdateLoaderProps {
  message: string | null;
  onClose: () => void;
}

export function StatusUpdateLoader({
  message,
  onClose,
}: StatusUpdateLoaderProps): React.ReactElement {
  if (!message) return <></>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg">
        <p>{message}</p>
        <button
          onClick={onClose}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
