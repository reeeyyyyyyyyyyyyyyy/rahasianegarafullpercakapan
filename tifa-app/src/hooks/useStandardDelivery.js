import { useNavigate } from "react-router-dom";
import { useUIStore } from "../store/uiStore";
import { useWebSocketStore } from "../store/websocketStore";
import { checkBatteryForDelivery } from "../utils/batteryCheck";

/**
 * Custom hook to standardize the start delivery flow for single-destination modes
 * (SpecialMode, GreetGuideMode, DirectDeliveryMode).
 */
export const useStandardDelivery = () => {
  const navigate = useNavigate();
  const { openConfirmDialog } = useUIStore();
  
  const isConnected = useWebSocketStore(state => state.isConnected);
  const sendMove = useWebSocketStore(state => state.sendMove);
  const robotBattery = useWebSocketStore(state => state.robotBattery);
  const setActiveDelivery = useWebSocketStore(state => state.setActiveDelivery);

  /**
   * Start a delivery to a single destination.
   * 
   * @param {Object} selectedDestination The db destination object
   * @param {string} modeType e.g., 'SPECIAL', 'GREET', 'DIRECT'
   * @param {Object} extraDeliveryData Any extra data to attach to active delivery
   * @returns {boolean} Whether the start was successful
   */
  const handleStartDelivery = (selectedDestination, modeType, extraDeliveryData = {}) => {
    if (!selectedDestination) {
      openConfirmDialog("No Destination", "Please select a destination first.", null);
      return false;
    }
    
    if (!isConnected) {
      openConfirmDialog("Not Connected", "WebSocket is not connected. Please check your connection.", null);
      return false;
    }

    // Check battery before starting delivery
    const batteryCheck = checkBatteryForDelivery(robotBattery?.battery_percent, 1);

    if (!batteryCheck.sufficient) {
      const confirmAction = batteryCheck.canOverride
        ? () => { executeSingleDelivery(selectedDestination, modeType, extraDeliveryData); }
        : null;

      openConfirmDialog(
        "Low Battery Warning",
        batteryCheck.message + (batteryCheck.canOverride
          ? "\n\nDo you want to proceed anyway?"
          : "\n\nPlease charge the robot before starting delivery."),
        confirmAction
      );
      return false;
    }

    return executeSingleDelivery(selectedDestination, modeType, extraDeliveryData);
  };

  const executeSingleDelivery = (selectedDestination, modeType, extraDeliveryData = {}) => {
    const coords = {
      x: selectedDestination.x,
      y: selectedDestination.y,
      yaw: selectedDestination.yaw
    };
    
    // Type needs to match backend protocol (null for Direct Delivery)
    const protocolType = modeType === 'DIRECT' ? null : modeType;
    
    const success = sendMove(destName, coords, 1, protocolType);
    
    if (success) {
      setActiveDelivery({
        type: 'MOVE',
        movementType: modeType, // Store internally as modeType string
        destination: destName,
        timestamp: Date.now(),
        ...extraDeliveryData
      });
      
      // Navigate to FaceExpression with happy expression
      navigate('/', { 
        state: { expressionType: 'happy' },
        replace: true 
      });
      
      return true;
    }
    
    return false;
  };

  return {
    isConnected,
    robotBattery,
    handleStartDelivery
  };
};
