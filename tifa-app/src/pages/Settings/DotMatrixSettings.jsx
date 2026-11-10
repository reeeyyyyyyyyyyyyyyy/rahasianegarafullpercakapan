import React from "react";
import { Smile } from "lucide-react";
import { clamp } from "../../hooks/useResponsive";

export const DotMatrixSettings = () => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <h2 className="font-semibold text-gray-800 mb-6"
          style={{ fontSize: clamp(18, 2, 26) }}>
        Dot Matrix Settings
      </h2>

      <div className="text-center">
        <Smile size={64} className="mx-auto text-gray-400" />
        <p className="mt-4 text-gray-600">Face display options coming soon.</p>
      </div>
    </div>
  );
};
