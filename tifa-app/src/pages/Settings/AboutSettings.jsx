import React from "react";
import { clamp } from "../../hooks/useResponsive";

export const AboutSettings = () => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <h2 className="font-semibold text-gray-800 mb-6"
        style={{ fontSize: clamp(18, 2, 26) }}>
        About
      </h2>

      <p className="text-gray-600 mb-2">Manufactured by:</p>
      <p className="font-medium">Forgix Robotics Solutions</p>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Version: 1.0.0</p>
      </div>
    </div>
  );
};
