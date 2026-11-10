import { useMemo } from 'react';

/**
 * Responsive units helper hook
 * Converts relative viewport units for responsive UI
 */
export const useResponsive = () => {
  return useMemo(() => ({
    // Viewport width percentage
    vw: (value) => `${value}vw`,
    
    // Viewport height percentage
    vh: (value) => `${value}vh`,
    
    // Minimum of viewport dimensions (for square elements)
    vmin: (value) => `${value}vmin`,
    
    // Maximum of viewport dimensions
    vmax: (value) => `${value}vmax`,
    
    // Clamp function for fluid typography
    clamp: (min, preferred, max) => `clamp(${min}px, ${preferred}vw, ${max}px)`,
    
    // Font size helper
    fontSize: (min, vw, max) => ({ fontSize: `clamp(${min}px, ${vw}vw, ${max}px)` }),
  }), []);
};

// Helper functions that can be used directly
export const vw = (value) => `${value}vw`;
export const vh = (value) => `${value}vh`;
export const vmin = (value) => `${value}vmin`;
export const vmax = (value) => `${value}vmax`;
export const clamp = (min, preferred, max) => `clamp(${min}px, ${preferred}vw, ${max}px)`;
