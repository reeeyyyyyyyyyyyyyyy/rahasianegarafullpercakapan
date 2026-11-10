import React from 'react';
import { BatteryIndicator } from './BatteryIndicator';
import { clamp } from '../hooks/useResponsive';
import { useWebSocketStore } from '../store/websocketStore';

const getVoltageColor = (voltage) => {
  if (voltage == null) return '#9CA3AF';
  if (voltage >= 12.0) return '#10B981';
  if (voltage >= 11.0) return '#F59E0B';
  return '#EF4444';
};

export const ConnectionStatus = ({ isConnected, batteryPercent, size = "sm", showDetails = false }) => {
  const wsConnected = useWebSocketStore(state => state.wsConnected);
  const adbConnected = useWebSocketStore(state => state.adbConnected);
  const robotBattery = useWebSocketStore(state => state.robotBattery);

  const voltage = robotBattery?.voltage ?? null;
  
  // Determine connection label
  const getConnectionLabel = () => {
    if (!isConnected) return 'Disconnected';
    if (wsConnected && adbConnected) return 'WS+ADB';
    if (wsConnected) return 'WS';
    if (adbConnected) return 'ADB';
    return 'Connected';
  };

  return (
    <div className="px-4 py-2 border-b border-gray-200">
      <div className="flex items-center gap-3 justify-center flex-wrap">
        <div className="flex items-center gap-2">
          {/* Main connection indicator */}
          <div 
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} 
          />
          <span 
            style={{ fontSize: clamp(9, 1, 11) }} 
            className="text-gray-500"
          >
            {getConnectionLabel()}
          </span>
          
          {/* Optional: Show individual connection dots */}
          {showDetails && isConnected && (
            <div className="flex items-center gap-1 ml-1">
              <div 
                className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-blue-500' : 'bg-gray-300'}`}
                title={wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
              />
              <div 
                className={`w-1.5 h-1.5 rounded-full ${adbConnected ? 'bg-purple-500' : 'bg-gray-300'}`}
                title={adbConnected ? 'ADB Connected' : 'ADB Disconnected'}
              />
            </div>
          )}
        </div>
        <div className="w-px h-4 bg-gray-300" />
        <BatteryIndicator 
          batteryPercent={batteryPercent} 
          size={size}
        />

        <div className="w-px h-4 bg-gray-300" />
        <div className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={getVoltageColor(voltage)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="6" width="18" height="12" rx="2" ry="2"/>
            <line x1="23" y1="10" x2="23" y2="14"/>
            <path d="M7 10v4M11 9v6" strokeWidth="1.5"/>
          </svg>
          <span style={{ fontSize: clamp(9, 1, 11), color: getVoltageColor(voltage) }} className="font-medium tabular-nums">
            {voltage != null ? `${voltage.toFixed(1)}V` : '?V'}
          </span>
        </div>
      </div>
    </div>
  );
};
