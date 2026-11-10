import React from 'react';
import { clamp } from '../hooks/useResponsive';

export const SelectedDisplay = ({ 
  label = "Selected:", 
  value = "-",
  fontSize = clamp(18, 2, 24),
  labelSize = clamp(12, 1.2, 14)
}) => {
  return (
    <>
      <div 
        style={{ fontSize: labelSize }} 
        className="text-gray-600 mb-3 font-medium"
      >
        {label}
      </div>
      <div className="bg-gray-600 text-white px-6 py-4 rounded-lg text-center w-full">
        <div
          style={{ fontSize }}
          className="font-bold"
        >
          {value}
        </div>
      </div>
    </>
  );
};
