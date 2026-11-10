import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenLayout } from "../../components/ScreenLayout";
import { ConnectionStatus } from "../../components/ConnectionStatus";
import { ModeHeader } from "../../components/ModeHeader";
import { ActionButton } from "../../components/ActionButton";
import { RobotBodySVG } from "../../components/RobotBodySVG";
import { vw, vh, clamp } from "../../hooks/useResponsive";
import { CloseIcon } from "../../components/Icons";
import { useUIStore } from "../../store/uiStore";
import { useWebSocketStore } from "../../store/websocketStore";
import { useDestinationStore } from "../../store/destinationStore";
import { useTrayStore } from "../../store/trayStore";
import { TRAY_CONFIG, TRAY_COLORS } from "../../constants/trayConstants";
import { countDestinations, checkBatteryForDelivery } from "../../utils/batteryCheck";

export const DeliveryMode = () => {
  const navigate = useNavigate();
  const [selectedTray, setSelectedTray] = useState(null);
  const [trayMapping, setTrayMapping] = useState({});
  const openConfirmDialog = useUIStore(state => state.openConfirmDialog);
  
  // Use individual selectors for proper reactivity
  const isConnected = useWebSocketStore(state => state.isConnected);
  const sendOperation = useWebSocketStore(state => state.sendOperation);
  const robotBattery = useWebSocketStore(state => state.robotBattery);
  const setActiveDelivery = useWebSocketStore(state => state.setActiveDelivery);
  
  const { destinations, loadDestinations } = useDestinationStore();
  const { trays } = useTrayStore();
  
  // Initialize tray mapping for all trays (enabled and disabled)
  useEffect(() => {
    const initialMapping = {};
    trays.forEach(tray => {
      initialMapping[tray.id] = [];
    });
    setTrayMapping(initialMapping);
  }, [trays.length]);
  
  // Load destinations from database on mount
  useEffect(() => {
    const fetchDestinations = async () => {
      await loadDestinations({ isActive: 1 });
    };
    fetchDestinations();
  }, [loadDestinations]);
  
  // Use full destination objects
  const DESTINATIONS = destinations;

  const handleTrayClick = (trayNum) => {
    // Check if this tray is enabled
    const tray = trays.find(t => t.id === trayNum);
    if (!tray || !tray.enabled) {
      // Don't allow selecting disabled trays
      return;
    }
    setSelectedTray(selectedTray === trayNum ? null : trayNum);
  };

  const handleDestClick = (dest) => {
    if (!selectedTray) return;
    
    // Double check: only allow adding to enabled trays
    const tray = trays.find(t => t.id === selectedTray);
    if (!tray || !tray.enabled) return;
    
    setTrayMapping(prev => {
      const current = prev[selectedTray] || [];
      // Compare by destination_id instead of string
      const exists = current.find(d => d.destination_id === dest.destination_id);
      if (exists) {
        return { ...prev, [selectedTray]: current.filter(d => d.destination_id !== dest.destination_id) };
      } else {
        return { ...prev, [selectedTray]: [...current, dest] };
      }
    });
  };

  const handleStart = () => {
    const hasSelection = Object.values(trayMapping).some(dests => dests.length > 0);
    if (!hasSelection) {
      openConfirmDialog("No Destinations", "Please select destinations for at least one tray.", null);
      return;
    }
    
    // Check WebSocket connection
    if (!isConnected) {
      openConfirmDialog("Not Connected", "WebSocket is not connected. Please check connection status.", null);
      return;
    }

    // Check battery before starting delivery
    const totalDests = countDestinations(trayMapping);
    const batteryCheck = checkBatteryForDelivery(robotBattery?.battery_percent, totalDests);

    if (!batteryCheck.sufficient) {
      const confirmAction = batteryCheck.canOverride
        ? () => { executeDeliveryStart(); }
        : null;

      openConfirmDialog(
        "Low Battery Warning",
        batteryCheck.message + (batteryCheck.canOverride
          ? "\n\nDo you want to proceed anyway?"
          : "\n\nPlease charge the robot before starting delivery."),
        confirmAction
      );
      return;
    }

    executeDeliveryStart();
  };

  const executeDeliveryStart = () => {
    // Count how many trays have destinations
    const activeTrays = Object.entries(trayMapping).filter(([_, dests]) => dests.length > 0);
    const isSingleTray = activeTrays.length === 1;

    // Function to execute delivery
    const executeDelivery = () => {
      // Build DESTINATION_COORDS from database
      const DESTINATION_COORDS = {};
      destinations.forEach(dest => {
        DESTINATION_COORDS[dest.name] = { x: dest.x, y: dest.y, yaw: dest.yaw };
      });
      
      // Send OP command via WebSocket
      const success = sendOperation(trayMapping, DESTINATION_COORDS);
      
      if (success) {
        // Get first destination for display
        const firstTray = activeTrays[0];
        const firstDest = firstTray ? firstTray[1][0]?.destination_name : 'destination';
        
        // Set active delivery for status display on FaceExpression
        setActiveDelivery({
          type: 'OP',
          movementType: 'DELIVERY',
          destination: firstDest,
          trayCount: activeTrays.length,
          timestamp: Date.now()
        });
        
        // Clear the tray mapping after successful send
        const clearedMapping = {};
        trays.forEach(tray => {
          clearedMapping[tray.id] = [];
        });
        setTrayMapping(clearedMapping);
        setSelectedTray(null);
        
        // Navigate to FaceExpression with happy expression
        navigate('/', { 
          state: { expressionType: 'happy' },
          replace: true 
        });
      }
    };

    // If only 1 tray, skip confirmation dialog
    if (isSingleTray) {
      executeDelivery();
      return;
    }
    
    // Multiple trays - show confirmation
    const summary = activeTrays
      .map(([tray, dests]) => `Tray ${tray}: ${dests.map(d => d.destination_name).join(", ")}`)
      .join("\n");
    
    openConfirmDialog("Start Delivery", `Ready to start?\n\n${summary}`, executeDelivery);
  };

  const getTrayColor = (trayNum) => {
    const tray = trays.find(t => t.id === trayNum);
    
    if (!tray || !tray.enabled) {
      return TRAY_COLORS.DISABLED;
    }
    
    if (trayMapping[trayNum]?.length > 0) return TRAY_COLORS.FILLED;
    if (selectedTray === trayNum) return TRAY_COLORS.SELECTED;
    
    return TRAY_COLORS.EMPTY;
  };

  const hasSelection = Object.values(trayMapping).some(dests => dests.length > 0);
  const isDisabled = !hasSelection || !isConnected;

  return (
    <ScreenLayout>
      <div className="h-full bg-white flex flex-col border-r border-gray-200" style={{ width: vw(25), minWidth: '200px', maxWidth: '280px', height: "100%" }}>
        <ModeHeader title="Delivery Mode" />

        <ConnectionStatus 
          isConnected={isConnected} 
          batteryPercent={robotBattery?.battery_percent} 
        />

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center px-4 py-4">
            <RobotBodySVG>
            {trays.map((tray, idx) => {
              const selected = trayMapping[tray.id] || [];
              const yPosition = TRAY_CONFIG.START_Y + idx * TRAY_CONFIG.SPACING;
              const isDisabled = !tray.enabled;
              
              return (
                <g key={tray.id}>
                  <rect
                    x={TRAY_CONFIG.X}
                    y={yPosition}
                    width={TRAY_CONFIG.WIDTH}
                    height={TRAY_CONFIG.HEIGHT}
                    rx={TRAY_CONFIG.RADIUS}
                    fill={getTrayColor(tray.id)}
                    stroke={TRAY_COLORS.STROKE}
                    strokeWidth={TRAY_CONFIG.STROKE_WIDTH}
                    strokeDasharray={isDisabled ? "4,2" : "0"}
                    className={isDisabled ? "cursor-not-allowed" : "cursor-pointer transition-colors"}
                    onClick={() => handleTrayClick(tray.id)}
                    opacity={isDisabled ? "0.5" : "1"}
                  />
                  {isDisabled && (
                    <text
                      x="60"
                      y={yPosition + 20}
                      textAnchor="middle"
                      fill="#6B7280"
                      fontSize="8"
                      fontWeight="500"
                      pointerEvents="none"
                    >
                      DISABLED
                    </text>
                  )}
                  {!isDisabled && selected.length > 0 && (
                    <foreignObject
                      x="30"
                      y={yPosition + 2}
                      width="61"
                      height="31"
                      onClick={() => handleTrayClick(tray.id)}
                      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    >
                      <div
                        xmlns="http://www.w3.org/1999/xhtml"
                        style={{
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2px 4px',
                          fontSize: '7px',
                          fontWeight: '500',
                          color: 'white',
                          textAlign: 'center',
                          lineHeight: '1.1',
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                        }}
                      >
                        {selected.slice(0, 3).map(d => d.destination_name).join(", ")}
                        {selected.length > 3 ? "..." : ""}
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </RobotBodySVG>
          </div>

          <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
            <div className="space-y-2">
              {Object.entries(trayMapping).map(([tray, dests]) => dests.length > 0 && (
                <div key={tray} className="bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span style={{ fontSize: clamp(10, 1.1, 13) }} className="font-medium opacity-90 flex-shrink-0">Tray {tray}</span>
                    <span style={{ fontSize: clamp(11, 1.2, 13) }} className="font-semibold truncate">{dests.map(d => d.destination_name).join(", ")}</span>
                  </div>
                  <button onClick={() => setTrayMapping(prev => ({ ...prev, [tray]: [] }))} className="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"><CloseIcon size={2} color="white" strokeWidth={2.5} /></button>
                </div>
              ))}
              {Object.values(trayMapping).every(d => d.length === 0) && <div className="text-center py-4 text-gray-400"><p style={{ fontSize: clamp(11, 1.2, 14) }}>No selections</p></div>}
            </div>
          </div>
        </div>

        <ActionButton 
          onClick={handleStart} 
          disabled={isDisabled}
          isConnected={isConnected}
          label="Start"
        />
      </div>

      <div className="flex-1 flex flex-col bg-gray-50" style={{ height: "100%", padding: `${vh(2)} ${vw(2)}` }}>
        <div className="bg-white rounded-2xl shadow-lg mt-12 p-6 h-full overflow-y-auto" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          <h3 style={{ fontSize: clamp(14, 1.5, 18) }} className="font-semibold text-gray-700 mb-4">Select Destinations</h3>
          <div className="grid grid-cols-4 gap-3" style={{ gap: vw(1.5) }}>
            {DESTINATIONS.map((dest) => {
              const isSelected = selectedTray && trayMapping[selectedTray]?.some(d => d.destination_id === dest.destination_id);
              return (
                <button 
                  key={dest.id} 
                  onClick={() => handleDestClick(dest)} 
                  disabled={!selectedTray} 
                  className={`rounded-xl border-2 transition-all font-medium ${
                    isSelected 
                      ? "bg-gray-600 border-gray-600 text-white shadow-md" 
                      : !selectedTray 
                        ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed" 
                        : "bg-white border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50 hover:shadow-sm"
                  }`} 
                  style={{ 
                    padding: `${vh(2.5)} ${vw(1)}`, 
                    fontSize: clamp(13, 1.5, 18), 
                    minHeight: vh(9) 
                  }}
                >
                  {dest.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
};
