import React from "react";
import { MessageSquare, Check } from "lucide-react";
import { clamp } from "../../hooks/useResponsive";

export const VoiceSettings = () => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <h2 className="font-semibold text-gray-800 mb-6"
          style={{ fontSize: clamp(18, 2, 26) }}>
        Voice Settings
      </h2>

      <div className="p-4 bg-gray-50 flex justify-between items-center rounded-lg">
        <span>Default Voice Package</span>
        <div className="bg-green-500 text-white rounded-full p-1">
          <Check size={16} />
        </div>
      </div>

      <button className="mt-6 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium">
        Customize Cruise Voice
      </button>
    </div>
  );
};
