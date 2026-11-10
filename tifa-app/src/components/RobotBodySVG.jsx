import React from "react";
import { SVG_CONFIG } from "../constants/trayConstants";

/**
 * Reusable Robot Body SVG Component
 * Used across DeliveryMode, DirectDeliveryMode, and TraySettings
 */
export const RobotBodySVG = ({ children, viewBox, className = "w-full max-w-[180px]" }) => (
  <svg viewBox={viewBox || SVG_CONFIG.VIEWBOX} className={className}>
    <path 
      d={SVG_CONFIG.ROBOT_PATH} 
      fill="none" 
      stroke={SVG_CONFIG.ROBOT_STROKE} 
      strokeWidth={SVG_CONFIG.ROBOT_STROKE_WIDTH}
    />
    {children}
  </svg>
);
