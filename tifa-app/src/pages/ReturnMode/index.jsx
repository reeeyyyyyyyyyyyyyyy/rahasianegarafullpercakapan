import React, { useState, useEffect } from "react";
import { ScreenLayout } from "../../components/ScreenLayout";
import { ConnectionStatus } from "../../components/ConnectionStatus";
import { ModeHeader } from "../../components/ModeHeader";
import { ActionButton } from "../../components/ActionButton";
import { vw, vh, clamp } from "../../hooks/useResponsive";
import { useUIStore } from "../../store/uiStore";
import { useWebSocketStore } from "../../store/websocketStore";
import { db } from "../../database/indexedDB";
import { HomeIcon, BatteryIcon } from "../../components/Icons";

export const ReturnMode = () => {
  const { openConfirmDialog } = useUIStore();

  // Use individual selectors for proper reactivity
  const isConnected = useWebSocketStore(state => state.isConnected);
  const sendMove = useWebSocketStore(state => state.sendMove);
  const robotBattery = useWebSocketStore(state => state.robotBattery);

  const [selectedMode, setSelectedMode] = useState(null);
  const [homeBase, setHomeBase] = useState(null);
  const [chargingStation, setChargingStation] = useState(null);

  // Load home base and charging station on mount
  useEffect(() => {
    const loadStations = async () => {
      try {
        // Get the active map ID to avoid hardcoding or mismatch
        const activeMapSetting = await db.settings.get('map_id');
        const activeMapId = activeMapSetting?.setting_value ? Number(activeMapSetting.setting_value) : null;

        let home = null;
        let charging = null;

        if (activeMapId) {
          const mapDests = await db.destinations.where('map_id').equals(activeMapId).toArray();
          home = mapDests.find(d => d.destination_type === 'HOME');
          charging = mapDests.find(d => d.destination_type === 'CHARGE');
        } else {
          // Fallback if no active map
          const allDests = await db.destinations.toArray();
          home = allDests.find(d => d.destination_type === 'HOME');
          charging = allDests.find(d => d.destination_type === 'CHARGE');
        }

        if (home) {
          setHomeBase({
            x: home.x,
            y: home.y,
            yaw: home.yaw,
            name: home.destination_name
          });
        } else {
          setHomeBase(null);
        }

        if (charging) {
          setChargingStation({
            x: charging.x,
            y: charging.y,
            yaw: charging.yaw,
            name: charging.destination_name
          });
        } else {
          setChargingStation(null);
        }
      } catch (error) {
        console.error('[ReturnMode] Error loading stations:', error);
      }
    };

    loadStations();
  }, []); // Empty dependency - only run once on mount

  const handleConfirm = () => {
    if (!selectedMode) return;

    if (!isConnected) {
      openConfirmDialog("Not Connected", "WebSocket is not connected. Please check your connection.", null);
      return;
    }

    if (selectedMode === "return") {
      if (!homeBase) {
        openConfirmDialog("No Home Base", "Home base position not configured in database.", null);
        return;
      }

      openConfirmDialog(
        "Return to Base",
        `Start returning to:\n${homeBase.name}?`,
        () => {
          // Send MOVE command with type "HOMEBASE"
          const coords = { x: homeBase.x, y: homeBase.y, yaw: homeBase.yaw };

          const success = sendMove(homeBase.name, coords, 999, "HOMEBASE");

          if (!success) {
            console.error('[ReturnMode] ❌ Failed to send HOMEBASE command');
          }
        }
      );
    } else if (selectedMode === "charge") {
      if (!chargingStation) {
        openConfirmDialog("No Charging Station", "Charging station position not configured in database.", null);
        return;
      }

      openConfirmDialog(
        "Charge",
        `Return to charging station:\n${chargingStation.name}?`,
        () => {
          // Send MOVE command with type "CHARGE"
          const coords = { x: chargingStation.x, y: chargingStation.y, yaw: chargingStation.yaw };

          const success = sendMove(chargingStation.name, coords, 999, "CHARGE");

          if (!success) {
            console.error('[ReturnMode] ❌ Failed to send CHARGE command');
          }
        }
      );
    }
  };

  const isDisabled = !selectedMode || !isConnected;

  return (
    <ScreenLayout>
      {/* LEFT PANEL */}
      <div
        className="h-full bg-white flex flex-col border-r border-gray-200"
        style={{ width: vw(25), minWidth: '200px', maxWidth: '280px', height: "100%" }}
      >
        <ModeHeader title="Return Mode" />

        <ConnectionStatus
          isConnected={isConnected}
          batteryPercent={robotBattery?.battery_percent}
        />

        {/* SELECTED MODE INDICATOR - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center justify-center">
            {selectedMode === null && (
              <div
                className="text-gray-400"
                style={{ opacity: 0.4 }}
              >
                <HomeIcon size={25} color="#A0A0A0" />
              </div>
            )}

            {selectedMode === "return" && (
              <HomeIcon size={25} color="#435063ff" />
            )}

            {selectedMode === "charge" && (
              <BatteryIcon size={25} color="#435063ff" />
            )}
          </div>
        </div>

        <ActionButton
          onClick={handleConfirm}
          disabled={isDisabled}
          isConnected={isConnected}
          label="Confirm"
        />
      </div>

      {/* RIGHT PANEL */}
      <div
        className="flex-1 flex flex-col bg-gray-50 mt-12"
        style={{ height: "100%", padding: `${vh(2)} ${vw(2)}` }}
      >
        <div
          className="bg-white rounded-2xl shadow-lg p-6 h-full flex items-center justify-center"
          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
        >
          <div className="text-center">
            <div
              style={{ fontSize: clamp(16, 1.8, 20) }}
              className="font-semibold text-gray-700 mb-4"
            >
              Select Return Mode
            </div>

            {/* RETURN ONLY */}
            {homeBase && (
              <button
                onClick={() => setSelectedMode(prev => (prev === "return" ? null : "return"))}
                className={`w-full rounded-xl border-2 px-6 py-4 transition-all font-semibold mb-4 ${selectedMode === "return"
                  ? "bg-gray-600 border-gray-600 text-white shadow-md"
                  : "bg-white border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50 hover:shadow-sm"
                  }`}
                style={{
                  fontSize: clamp(16, 1.8, 22),
                  minHeight: vh(12),
                }}
              >
                Return to Base
              </button>
            )}

            {/* RETURN AND CHARGE */}
            {chargingStation && (
              <button
                onClick={() => setSelectedMode(prev => (prev === "charge" ? null : "charge"))}
                className={`w-full rounded-xl border-2 px-6 py-4 transition-all font-semibold mb-4 ${selectedMode === "charge"
                  ? "bg-gray-600 border-gray-600 text-white shadow-md"
                  : "bg-white border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50 hover:shadow-sm"
                  }`}
                style={{
                  fontSize: clamp(16, 1.8, 22),
                  minHeight: vh(12),
                }}
              >
                Charge
              </button>
            )}

            {!homeBase && !chargingStation && (
              <div
                style={{ fontSize: clamp(14, 1.5, 18) }}
                className="text-red-500 font-medium bg-red-50 p-4 rounded-xl border border-red-200 mt-4"
              >
                No Return (code/type HOME) or Charge (code/type CHARGE) destinations are configured for this Map!
              </div>
            )}

            <div
              style={{ fontSize: clamp(14, 1.5, 18) }}
              className="text-gray-600 mt-6"
            >
              Press a mode to continue
            </div>
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
};
