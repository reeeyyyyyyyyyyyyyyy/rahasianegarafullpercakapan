import React, { useState } from "react";
import { Wifi } from "lucide-react";
import { clamp } from "../../hooks/useResponsive";

export const WlanSettings = () => {
  const [wifiList] = useState(["RestaurantWifi", "KitchenWifi", "RobotAP", "PublicWifi"]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <h2 className="font-semibold text-gray-800 mb-6"
          style={{ fontSize: clamp(18, 2, 26) }}>
        WLAN Settings
      </h2>

      <div className="space-y-3">
        {wifiList.map((name) => (
          <div key={name}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
            <span className="font-medium">{name}</span>
            <Wifi size={20} className="text-gray-500" />
          </div>
        ))}
      </div>
    </div>
  );
};
