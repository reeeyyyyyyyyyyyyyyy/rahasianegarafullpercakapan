import React from 'react';
import { vw, vh, clamp } from '../hooks/useResponsive';

export const DestinationGrid = ({ 
  destinations, 
  selectedDestination, 
  onSelect,
  columns = 4 
}) => {
  return (
    <div 
      className={`grid grid-cols-${columns} gap-3`}
      style={{ gap: vw(1.5) }}
    >
      {destinations.map((dest) => {
        const destId = dest.destination_id || dest.id;
        const destName = dest.destination_name || dest.name;
        const isSelected = selectedDestination?.destination_id === destId || 
                          selectedDestination?.id === destId;
        
        return (
          <button 
            key={destId} 
            onClick={() => onSelect(prev => {
              const prevId = prev?.destination_id || prev?.id;
              return prevId === destId ? null : dest;
            })} 
            className={`rounded-xl border-2 transition-all font-semibold ${
              isSelected
                ? "bg-gray-600 border-gray-600 text-white shadow-md" 
                : "bg-white border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50 hover:shadow-sm"
            }`} 
            style={{ 
              padding: `${vh(2.5)} ${vw(1)}`, 
              fontSize: clamp(14, 1.6, 19), 
              minHeight: vh(10) 
            }}
          >
            {destName}
          </button>
        );
      })}
    </div>
  );
};
