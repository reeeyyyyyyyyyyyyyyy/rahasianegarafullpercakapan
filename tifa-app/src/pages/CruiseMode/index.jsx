import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenLayout } from "../../components/ScreenLayout";
import { ConnectionStatus } from "../../components/ConnectionStatus";
import { ModeHeader } from "../../components/ModeHeader";
import { ActionButton } from "../../components/ActionButton";
import { vw, vh, clamp } from "../../hooks/useResponsive";
import { useUIStore } from "../../store/uiStore";
import { useWebSocketStore } from "../../store/websocketStore";

const ROUTES = [{ id: 1, name: "Route A", waypoints: 5 }, { id: 2, name: "Route B", waypoints: 4 }, { id: 3, name: "Route C", waypoints: 6 }, { id: 4, name: "Route D", waypoints: 3 }, { id: 5, name: "Route E", waypoints: 7 }];

export const CruiseMode = () => {
  const navigate = useNavigate();
  const [selectedRoute, setSelectedRoute] = useState(null);
  const { openConfirmDialog } = useUIStore();
  
  // Use individual selectors for proper reactivity
  const isConnected = useWebSocketStore(state => state.isConnected);
  const robotBattery = useWebSocketStore(state => state.robotBattery);
  const sendMove = useWebSocketStore(state => state.sendMove);
  const setActiveDelivery = useWebSocketStore(state => state.setActiveDelivery);

  const handleStart = () => {
    if (!selectedRoute) {
      openConfirmDialog("No Route", "Please select a route first.", null);
      return;
    }
    
    if (!isConnected) {
      openConfirmDialog("Not Connected", "WebSocket is not connected. Please check your connection.", null);
      return;
    }
    
    // Send MOVE command with type CRUISE
    const success = sendMove(selectedRoute.name, { x: 0, y: 0, yaw: 0 }, 1, "CRUISE");
    
    if (success) {
      // Set active delivery for status display on FaceExpression
      setActiveDelivery({
        type: 'MOVE',
        movementType: 'CRUISE',
        destination: selectedRoute.name,
        waypoints: selectedRoute.waypoints,
        timestamp: Date.now()
      });
      
      setSelectedRoute(null);
      
      // Navigate to FaceExpression with happy expression
      navigate('/', { 
        state: { expressionType: 'happy' },
        replace: true 
      });
    }
  };
  
  const isDisabled = !selectedRoute || !isConnected;

  return (
    <ScreenLayout>
      <div className="h-full bg-white flex flex-col border-r border-gray-200" style={{ width: vw(25), minWidth: '200px', maxWidth: '280px', height: "100%" }}>
        <ModeHeader title="Cruise Mode" />
        
        <ConnectionStatus 
          isConnected={isConnected} 
          batteryPercent={robotBattery?.battery_percent} 
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {ROUTES.map((route) => (
            <button key={route.id} onClick={() => setSelectedRoute(prev => (prev?.id === route.id ? null : route))} className={`w-full p-3 rounded-lg text-left transition-all border-2 font-semibold ${selectedRoute?.id === route.id ? "bg-gray-600 border-gray-600 text-white" : "bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50"}`} style={{ fontSize: clamp(13, 1.3, 16) }}>
              <div className="font-bold">{route.name}</div>
              <div style={{ fontSize: clamp(11, 1.1, 13) }} className="opacity-80">Waypoints: {route.waypoints}</div>
            </button>
          ))}
        </div>

        <ActionButton 
          onClick={handleStart} 
          disabled={isDisabled}
          isConnected={isConnected}
          label="Start"
        />
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col bg-gray-50 mt-12" style={{ height: "100%", padding: `${vh(2)} ${vw(2)}` }}>
        <div className="bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)", height: "100%" }}>
          <h3 style={{ fontSize: clamp(14, 1.5, 18) }} className="font-semibold text-gray-700 px-6 pt-6 pb-4 flex-shrink-0">Route Map</h3>
          <div className="flex-1 px-6 pb-6 overflow-hidden">
            {selectedRoute ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                  <div style={{ fontSize: clamp(24, 2.5, 32) }} className="font-bold text-gray-600 mb-3">{selectedRoute.name}</div>
                  <div style={{ fontSize: clamp(14, 1.5, 18) }} className="text-gray-700 mb-4">Waypoints: {selectedRoute.waypoints}</div>
                  <div style={{ fontSize: clamp(12, 1.3, 15) }} className="text-gray-500">Map visualization area</div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                <div style={{ fontSize: clamp(14, 1.5, 18) }} className="text-gray-500">Select a route to display map</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
};
