/**
 * Tray Configuration Constants
 * Centralized tray settings for consistency across all modes
 */

export const TRAY_CONFIG = {
  // Position
  START_Y: 65,
  SPACING: 45,
  
  // Dimensions
  X: 28,
  WIDTH: 65,
  HEIGHT: 35,
  RADIUS: 6,
  
  // Stroke
  STROKE_WIDTH: 1.5,
};

export const TRAY_COLORS = {
  // Fill colors
  FILLED: '#4B5563',    // gray-600 - Tray with destinations
  SELECTED: '#6B7280',  // gray-500 - Tray selected/clicked
  EMPTY: '#9CA3AF',     // gray-400 - Empty tray
  DISABLED: '#D1D5DB',  // gray-300 - Disabled tray
  
  // Border
  STROKE: '#9CA3AF',    // gray-400 - Border color for all states
  
  // Text
  TEXT_ACTIVE: '#FFFFFF',   // white - Text on active/filled tray
  TEXT_INACTIVE: '#6B7280', // gray-500 - Text on inactive tray
  TEXT_DISABLED: '#6B7280', // gray-500 - Text on disabled tray
};

export const SVG_CONFIG = {
  VIEWBOX: '0 25 120 235',
  MAX_WIDTH: '180px',
  ROBOT_PATH: 'M 10 55 Q 10 30 45 30 L 75 30 Q 110 30 110 55 L 110 230 Q 110 255 75 255 L 45 255 Q 10 255 10 230 Z',
  ROBOT_STROKE: '#232a34ff',
  ROBOT_STROKE_WIDTH: '2.5',
};
