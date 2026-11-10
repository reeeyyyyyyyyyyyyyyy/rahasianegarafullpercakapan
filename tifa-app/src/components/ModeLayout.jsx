import React from "react";
import { ScreenLayout } from "./ScreenLayout";
import { ConnectionStatus } from "./ConnectionStatus";
import { ModeHeader } from "./ModeHeader";
import { ActionButton } from "./ActionButton";
import { vw, vh } from "../hooks/useResponsive";

/**
 * A standardized layout for operational modes (Special, Direct, Greet).
 * Eliminates duplicate left/right panel boilerplate.
 * 
 * @param {Object} props
 * @param {string} props.title - Title for the ModeHeader
 * @param {boolean} props.isConnected - WebSocket connection status
 * @param {Object} props.robotBattery - Battery object from WebSocket
 * @param {Function} props.onStart - Callback for the "Go" / "Start" button
 * @param {boolean} props.isStartDisabled - Whether the start button is disabled
 * @param {React.ReactNode} props.leftPanelContent - Content explicitly for the left panel scroll unit
 * @param {React.ReactNode} props.rightPanelContent - Complete content for the right panel
 */
export const ModeLayout = ({
  title,
  isConnected,
  robotBattery,
  onStart,
  isStartDisabled,
  leftPanelContent,
  rightPanelContent
}) => {
  return (
    <ScreenLayout>
      {/* LEFT PANEL */}
      <div 
        className="h-full bg-white flex flex-col border-r border-gray-200" 
        style={{ width: vw(25), minWidth: '200px', maxWidth: '280px', height: "100%" }}
      >
        <ModeHeader title={title} />
        
        <ConnectionStatus 
          isConnected={isConnected} 
          batteryPercent={robotBattery?.battery_percent} 
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {leftPanelContent}
        </div>

        <ActionButton 
          onClick={onStart} 
          disabled={isStartDisabled}
          isConnected={isConnected}
          label="Go"
        />
      </div>

      {/* RIGHT PANEL */}
      <div 
        className="flex-1 flex flex-col bg-gray-50" 
        style={{ height: "100%", padding: `${vh(2)} ${vw(2)}` }}
      >
        {rightPanelContent}
      </div>
    </ScreenLayout>
  );
};
