import React from 'react';
import { vh, clamp } from '../hooks/useResponsive';

export const ActionButton = ({ 
  onClick, 
  disabled, 
  label = "Start",
  isConnected = true
}) => {
  const getButtonText = () => {
    if (!isConnected) return "Not Connected";
    if (disabled) return label;
    return label;
  };

  return (
    <div className="border-t border-gray-200 px-3 py-2 flex-shrink-0" style={{ paddingBottom: vh(1.5) }}>
      <button 
        onClick={onClick} 
        disabled={disabled} 
        className={`w-full rounded-xl font-semibold transition-all ${
          disabled 
            ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
            : "bg-gray-600 hover:bg-gray-700 text-white"
        }`} 
        style={{ 
          padding: `${vh(1.5)} 0`, 
          fontSize: clamp(13, 1.4, 16),
          minHeight: '40px'
        }}
      >
        {getButtonText()}
      </button>
    </div>
  );
};
