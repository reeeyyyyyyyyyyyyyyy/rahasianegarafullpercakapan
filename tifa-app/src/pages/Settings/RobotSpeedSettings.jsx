import React, { useState, useEffect } from "react";
import { Gauge, Zap, Activity } from "lucide-react";
import { clamp } from "../../hooks/useResponsive";
import { useSettingsStore } from "../../store/settingsStore";

/**
 * Robot Speed Mode Settings
 * Controls S (Slow) / F (Fast) / VF (Very Fast) modes
 */
export const RobotSpeedSettings = () => {
  const [robotSpeed, setRobotSpeed] = useState('F');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState('');

  const setRobotSpeedMode = useSettingsStore(state => state.setRobotSpeed);
  const getRobotSpeedMode = useSettingsStore(state => state.getRobotSpeed);

  // Load current robot speed on mount
  useEffect(() => {
    const loadSpeed = async () => {
      const current = await getRobotSpeedMode();
      setRobotSpeed(current || 'F');
    };
    loadSpeed();
  }, [getRobotSpeedMode]);

  const speedModes = [
    {
      code: 'S',
      label: 'Slow',
      description: 'Safe & cautious',
      icon: Activity,
      color: 'from-yellow-400 to-amber-500',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      bgColor: 'bg-amber-50',
    },
    {
      code: 'F',
      label: 'Fast',
      description: 'Normal operation',
      icon: Gauge,
      color: 'from-blue-400 to-blue-600',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50',
    },
    {
      code: 'VF',
      label: 'Very Fast',
      description: 'Maximum speed',
      icon: Zap,
      color: 'from-red-400 to-red-600',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      bgColor: 'bg-red-50',
    },
  ];

  const handleSpeedChange = async (speedCode) => {
    setIsSending(true);
    setSendStatus('');

    try {
      const success = await setRobotSpeedMode(speedCode);
      if (success) {
        setRobotSpeed(speedCode);
        setSendStatus('✅ Speed updated successfully');
        setTimeout(() => setSendStatus(''), 2000);
      } else {
        setSendStatus('❌ Failed to update speed');
        setTimeout(() => setSendStatus(''), 3000);
      }
    } catch (error) {
      console.error('Failed to update robot speed:', error);
      setSendStatus('❌ Failed to update speed');
      setTimeout(() => setSendStatus(''), 3000);
    } finally {
      setIsSending(false);
    }
  };

  const currentModeConfig = speedModes.find(m => m.code === robotSpeed) || speedModes[1];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <div className="mb-6">
        <h2 
          className="font-semibold text-gray-800 mb-2"
          style={{ fontSize: clamp(18, 2, 26) }}
        >
          Robot Speed Mode
        </h2>
        <p className="text-sm text-gray-500">
          Select the movement speed for the robot
        </p>
      </div>

      {/* Current Speed Display */}
      <div 
        className={`${currentModeConfig.bgColor} border-2 ${currentModeConfig.borderColor} rounded-xl p-4 mb-6`}
      >
        <div className="flex items-center gap-3">
          <div className={`bg-gradient-to-r ${currentModeConfig.color} p-3 rounded-lg`}>
            <currentModeConfig.icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className={`font-bold text-lg ${currentModeConfig.textColor}`}>
              {currentModeConfig.label} Mode
            </p>
            <p className="text-sm text-gray-600">
              {currentModeConfig.description}
            </p>
          </div>
        </div>
      </div>

      {/* Speed Mode Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {speedModes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = robotSpeed === mode.code;

          return (
            <button
              key={mode.code}
              onClick={() => handleSpeedChange(mode.code)}
              disabled={isSending}
              className={`p-4 rounded-xl transition-all duration-300 flex flex-col items-center gap-2 ${
                isSelected
                  ? `bg-gradient-to-r ${mode.color} text-white shadow-lg scale-105`
                  : `${mode.bgColor} border-2 ${mode.borderColor} ${mode.textColor} hover:shadow-md`
              } ${isSending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-label={`Set speed to ${mode.label}`}
            >
              <Icon className="w-6 h-6" />
              <span className="font-bold text-sm">{mode.label}</span>
              <span className="text-xs opacity-75">({mode.code})</span>
            </button>
          );
        })}
      </div>

      {/* Status Message */}
      {sendStatus && (
        <div 
          className={`text-center text-sm font-medium py-2 px-3 rounded-lg ${
            sendStatus.includes('✅')
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {sendStatus}
        </div>
      )}

      {isSending && (
        <div className="text-center text-sm text-gray-600 py-2">
          <span className="inline-block mr-2">Sending command</span>
          <span className="inline-block animate-bounce">.</span>
          <span className="inline-block animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
          <span className="inline-block animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
        </div>
      )}
    </div>
  );
};
