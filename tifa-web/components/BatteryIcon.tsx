import React from 'react';

export function BatteryIcon({ level, className }: { level: number; className?: string }) {
  // Clamp level between 0 and 100
  const percentage = Math.max(0, Math.min(100, level));
  
  // The maximum width of the inner active fill area is 12px
  const fillWidth = 12 * (percentage / 100);

  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Battery body outline */}
      <rect 
        x="2" 
        y="7" 
        width="17" 
        height="10" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="2" 
      />
      
      {/* Battery positive terminal (tip) */}
      <path 
        d="M22 10v4" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      
      {/* Subtle background track for the empty battery fraction */}
      <rect 
        x="4.5" 
        y="9.5" 
        width="12" 
        height="5" 
        rx="0.75" 
        fill="currentColor" 
        fillOpacity="0.12" 
      />
      
      {/* Dynamic active fill area based on percentage */}
      {fillWidth > 0 && (
        <rect 
          x="4.5" 
          y="9.5" 
          width={fillWidth} 
          height="5" 
          rx="0.75" 
          fill="currentColor" 
        />
      )}
    </svg>
  );
}
