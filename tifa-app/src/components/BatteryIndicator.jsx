import React from 'react';
import { clamp } from '../hooks/useResponsive';

export const BatteryIndicator = ({ batteryPercent, className = '', size = 'sm' }) => {
  // Default to ? if no battery data
  const displayPercent = batteryPercent ?? null;
  const numericPercent = typeof batteryPercent === 'number' ? batteryPercent : 0;
  
  // Determine battery fill color based on level
  const getBatteryFillColor = () => {
    if (displayPercent === null) return '#D1D5DB'; // gray-300
    if (numericPercent > 60) return '#10B981'; // green-500
    if (numericPercent > 20) return '#F59E0B'; // amber-500
    return '#EF4444'; // red-500
  };
  
  // Determine text color based on level
  const getTextColor = () => {
    if (displayPercent === null) return '#9CA3AF'; // gray-400
    if (numericPercent > 60) return '#FFFFFF'; // white for green background
    if (numericPercent > 20) return '#78350F'; // amber-900 for amber background
    return '#7F1D1D'; // red-900 for red background
  };
  
  const fontSize = size === 'sm' ? 10 : 14;
  const batteryWidth = size === 'sm' ? 40 : 50;
  const batteryHeight = size === 'sm' ? 16 : 20;
  
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Battery Icon with horizontal fill */}
      <div className="relative flex items-center">
        {/* Battery body */}
        <div 
          className="relative border-2 rounded-sm flex items-center justify-center overflow-hidden"
          style={{ 
            width: `${batteryWidth}px`, 
            height: `${batteryHeight}px`,
            borderColor: '#6B7280', // gray-500
          }}
        >
          {/* Battery fill (from left to right) */}
          <div 
            className="absolute left-0 top-0 bottom-0 transition-all duration-300"
            style={{ 
              width: displayPercent === null ? '0%' : `${numericPercent}%`,
              backgroundColor: getBatteryFillColor(),
            }}
          />
          
          {/* Percentage text */}
          <span 
            className="relative z-10 font-semibold"
            style={{ 
              fontSize: `${fontSize}px`,
              color: getTextColor(),
              textShadow: displayPercent === null ? 'none' : '0 0 2px rgba(0,0,0,0.2)',
            }}
          >
            {displayPercent === null ? '?' : `${Math.round(numericPercent)}%`}
          </span>
        </div>
        
        {/* Battery tip (right side) */}
        <div 
          className="rounded-r-sm"
          style={{ 
            width: '3px', 
            height: `${batteryHeight * 0.6}px`,
            backgroundColor: '#6B7280', // gray-500
            marginLeft: '1px',
          }}
        />
      </div>
    </div>
  );
};
