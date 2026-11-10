import React from "react";
import { Bug } from "lucide-react";
import { clamp } from "../../hooks/useResponsive";

export const DebugSettings = () => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <h2 className="font-semibold text-gray-800 mb-6"
          style={{ fontSize: clamp(18, 2, 26) }}>
        Debug Menu
      </h2>

      <div className="p-4 bg-gray-100 rounded-lg flex items-center gap-3">
        <Bug size={24} className="text-gray-500" />
        <span className="text-gray-700">Log inspection • Developer mode</span>
      </div>
    </div>
  );
};
