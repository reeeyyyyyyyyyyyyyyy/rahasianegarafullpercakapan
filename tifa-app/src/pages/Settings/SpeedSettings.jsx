import React, { useState } from "react";
import { Slider } from "../../components/Slider";
import { Gauge, Upload, Map } from "lucide-react";
import { clamp } from "../../hooks/useResponsive";
import { RobotSpeedSettings } from "./RobotSpeedSettings";

export const SpeedSettings = () => {
  const [delivery, setDelivery] = useState(0.8);
  const [cruise, setCruise] = useState(0.7);
  const [returnSpeed, setReturnSpeed] = useState(0.7);

  return (
    <div className="space-y-6">
      {/* Robot Speed Mode Selector */}
      <RobotSpeedSettings />

      {/* Operation Speed Profiles */}
      <div className="bg-white rounded-2xl p-6 shadow-md">
        <h2 
          className="font-semibold text-gray-800 mb-6"
          style={{ fontSize: clamp(18, 2, 26) }}
        >
          Operation Speed Profiles
        </h2>

        <Slider label="Delivery Speed" icon={Upload} value={delivery} onChange={setDelivery} />
        <Slider label="Cruise Speed" icon={Map} value={cruise} onChange={setCruise} />
        <Slider label="Return Speed" icon={Gauge} value={returnSpeed} onChange={setReturnSpeed} />
      </div>
    </div>
  );
};
