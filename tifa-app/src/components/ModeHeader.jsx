import React from 'react';
import { clamp } from '../hooks/useResponsive';

export const ModeHeader = ({ title }) => {
  return (
    <div className="px-4 py-3 border-b border-gray-200">
      <div className="bg-gray-600 text-white px-4 py-2 rounded-lg text-center">
        <span 
          style={{ fontSize: clamp(12, 1.3, 15) }} 
          className="font-semibold"
        >
          {title}
        </span>
      </div>
    </div>
  );
};
