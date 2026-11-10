import React from "react";

export const Slider = ({ label, min = 0, max = 100, step = 1, value, onChange }) => {
  return (
    <div className="mb-6">
      {label && (
        <div className="mb-2 text-gray-700 font-medium">
          {label}
        </div>
      )}

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-gray-600"
      />

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}</span>
        <span>{value}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};
