import React from "react";
import { clamp } from "../../hooks/useResponsive";
import { TraySVGSelector } from "../../components/TraySVGSelector";
import { useTrayStore } from "../../store/trayStore";
import { useUIStore } from "../../store/uiStore";

export const TraySettings = () => {
  const { trays, updateTray } = useTrayStore();
  const openConfirmDialog = useUIStore(state => state.openConfirmDialog);

  const toggleTray = (trayNum) => {
    const tray = trays.find(t => t.id === trayNum);
    if (!tray) return;

    const newState = !tray.enabled;
    const action = newState ? 'Enable' : 'Disable';

    openConfirmDialog(
      `${action} Tray ${trayNum}`,
      `Are you sure you want to ${action.toLowerCase()} Tray ${trayNum}?`,
      async () => {
        await updateTray(trayNum, { enabled: newState });
      }
    );
  };

  // Get active tray IDs
  const activeTrays = trays.filter(t => t.enabled).map(t => t.id);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <h2
        className="font-semibold text-gray-800 mb-6"
        style={{ fontSize: clamp(18, 2, 26) }}
      >
        Tray Settings
      </h2>

      <div className="flex justify-center items-center">
        <TraySVGSelector
          activeTrays={activeTrays}
          onToggle={toggleTray}
        />
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Active: {activeTrays.length} / {trays.length} trays
        </p>
      </div>
    </div>
  );
};
