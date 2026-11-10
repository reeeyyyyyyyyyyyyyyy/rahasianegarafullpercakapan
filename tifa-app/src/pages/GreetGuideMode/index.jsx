import React, { useState, useEffect } from "react";
import { ModeLayout } from "../../components/ModeLayout";
import { SelectedDisplay } from "../../components/SelectedDisplay";
import { DestinationGrid } from "../../components/DestinationGrid";
import { clamp, vh } from "../../hooks/useResponsive";
import { useDestinationStore } from "../../store/destinationStore";
import { useStandardDelivery } from "../../hooks/useStandardDelivery";

export const GreetGuideMode = () => {
  const [selectedDestination, setSelectedDestination] = useState(null);
  
  const { destinations, loadDestinations } = useDestinationStore();
  const { isConnected, robotBattery, handleStartDelivery } = useStandardDelivery();
  
  // Load destinations from store on mount
  useEffect(() => {
    loadDestinations({ isActive: 1 });
  }, [loadDestinations]);
  
  const handleStart = () => {
    const success = handleStartDelivery(selectedDestination, 'GREET');
    if (success) {
      setSelectedDestination(null);
    }
  };

  const destName = selectedDestination?.destination_name || selectedDestination?.name || "-";
  const isDisabled = !selectedDestination || !isConnected;

  const leftPanelContent = (
    <SelectedDisplay value={destName} />
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
      title="Greet and Guide"
      isConnected={isConnected}
      robotBattery={robotBattery}
      onStart={handleStart}
      isStartDisabled={isDisabled}
      leftPanelContent={leftPanelContent}
      rightPanelContent={rightPanelContent}
    />
  );
};
