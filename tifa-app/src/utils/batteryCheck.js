const BATTERY_PER_DESTINATION = 5;
const MIN_BATTERY_TO_START = 20;
const BATTERY_WARNING_THRESHOLD = 30;

export const countDestinations = (trayMapping) => {
  return Object.values(trayMapping).reduce((total, dests) => total + dests.length, 0);
};

export const estimateBatteryNeeded = (destinationCount) => {
  return MIN_BATTERY_TO_START + (destinationCount * BATTERY_PER_DESTINATION);
};

export const checkBatteryForDelivery = (currentBattery, destinationCount) => {
  if (currentBattery == null) {
    return {
      sufficient: true,
      canOverride: true,
      message: 'Battery data not available yet. Delivery allowed.',
    };
  }

  if (currentBattery < MIN_BATTERY_TO_START) {
    return {
      sufficient: false,
      canOverride: false,
      message: `Battery too low! Current: ${Math.round(currentBattery)}%. Please charge the robot first.`,
    };
  }

  if (currentBattery < BATTERY_WARNING_THRESHOLD) {
    return {
      sufficient: false,
      canOverride: true,
      message: `Battery is low. Current: ${Math.round(currentBattery)}%.`,
    };
  }

  return { sufficient: true, canOverride: true, message: null };
};
