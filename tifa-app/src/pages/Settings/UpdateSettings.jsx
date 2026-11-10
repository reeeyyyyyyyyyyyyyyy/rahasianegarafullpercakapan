import React from "react";
import { Upload } from "lucide-react";
import { clamp } from "../../hooks/useResponsive";

export const UpdateSettings = () => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <h2 className="font-semibold text-gray-800 mb-6"
          style={{ fontSize: clamp(18, 2, 26) }}>
        Software Update
      </h2>

      <button className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium">
        Check for Updates
      </button>

      <div className="mt-4 p-4 bg-gray-50 text-gray-600 rounded-lg text-center">
        Your software is up to date.
      </div>
    </div>
  );
};
