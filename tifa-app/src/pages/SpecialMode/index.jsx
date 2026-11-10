import React, { useState, useEffect } from "react";
import { ModeLayout } from "../../components/ModeLayout";
import { SelectedDisplay } from "../../components/SelectedDisplay";
import { DestinationGrid } from "../../components/DestinationGrid";
import { clamp, vh } from "../../hooks/useResponsive";
import { useDestinationStore } from "../../store/destinationStore";
import { useStandardDelivery } from "../../hooks/useStandardDelivery";

const MUSIC_OPTIONS = [
  { id: 1, name: "Happy Birthday" }, 
  { id: 2, name: "Jingle Bells" }, 
  { id: 3, name: "Twinkle Twinkle" }, 
  { id: 4, name: "Happy Day" }
];

export const SpecialMode = () => {
  const [selectedMusic, setSelectedMusic] = useState(1);
  const [selectedDestination, setSelectedDestination] = useState(null);
  
  const { destinations, loadDestinations } = useDestinationStore();
  const { isConnected, robotBattery, handleStartDelivery } = useStandardDelivery();
  
  // Load destinations from store on mount
  useEffect(() => {
    loadDestinations({ isActive: 1 });
  }, [loadDestinations]);
  
  const handleStart = () => {
    const musicName = MUSIC_OPTIONS.find(m => m.id === selectedMusic).name;
    const success = handleStartDelivery(selectedDestination, 'SPECIAL', { music: musicName });
    if (success) {
      setSelectedDestination(null);
    }
  };

  const destName = selectedDestination?.destination_name || selectedDestination?.name || "-";
  const isDisabled = !selectedDestination || !isConnected;

  const leftPanelContent = (
    <>
      <div className="mb-4">
        <label style={{ fontSize: clamp(11, 1.1, 13) }} className="block text-gray-600 font-medium mb-2">Select Music:</label>
        <select 
          value={selectedMusic} 
          onChange={(e) => setSelectedMusic(Number(e.target.value))} 
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500" 
          style={{ fontSize: clamp(12, 1.2, 14) }}
        >
          {MUSIC_OPTIONS.map((music) => (
            <option key={music.id} value={music.id}>{music.name}</option>
          ))}
        </select>
      </div>
      <div>
        <SelectedDisplay 
          value={destName}
          fontSize={clamp(14, 1.6, 18)}
        />
      </div>
    </>
  );

  const rightPanelContent = (
    <div className="bg-white rounded-2xl shadow-lg mt-12 p-6 h-full overflow-y-auto" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <h3 style={{ fontSize: clamp(14, 1.5, 18) }} className="font-semibold text-gray-700 mb-4">Select Destination</h3>
      <DestinationGrid 
        destinations={destinations}
        selectedDestination={selectedDestination}
        onSelect={setSelectedDestination}
      />
    </div>
  );

  return (
    <ModeLayout 
      title="Special Mode"
      isConnected={isConnected}
      robotBattery={robotBattery}
      onStart={handleStart}
      isStartDisabled={isDisabled}
      leftPanelContent={leftPanelContent}
      rightPanelContent={rightPanelContent}
    />
  );
};
