import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, Zap, X } from 'lucide-react';
import { useWebSocketStore } from '../store/websocketStore';

/**
 * Robot Error Display Component
 * Shows real-time robot errors with severity levels
 * Non-critical errors auto-dismiss after 5 seconds
 * All errors can be manually dismissed
 */
export default function RobotErrorDisplay() {
  const { robotError, clearRobotError } = useWebSocketStore();

  useEffect(() => {
    if (!robotError) return;

    // Auto-dismiss non-critical errors after 5 seconds
    if (!['CRITICAL', 'HIGH'].includes(robotError.severity?.toUpperCase())) {
      const timer = setTimeout(() => {
        clearRobotError();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [robotError, clearRobotError]);

  if (!robotError) return null;

  const severityConfig = {
    'LOW': {
      bg: 'bg-yellow-100',
      border: 'border-yellow-400',
      icon: AlertTriangle,
      color: 'text-yellow-600',
      label: '⚠️ Low Priority',
      bgGradient: 'from-yellow-50 to-yellow-100',
    },
    'MEDIUM': {
      bg: 'bg-orange-100',
      border: 'border-orange-400',
      icon: AlertTriangle,
      color: 'text-orange-600',
      label: '⚠️ Medium Priority',
      bgGradient: 'from-orange-50 to-orange-100',
    },
    'HIGH': {
      bg: 'bg-red-100',
      border: 'border-red-400',
      icon: AlertCircle,
      color: 'text-red-600',
      label: '❌ High Priority',
      bgGradient: 'from-red-50 to-red-100',
    },
    'CRITICAL': {
      bg: 'bg-red-900',
      border: 'border-red-700',
      icon: Zap,
      color: 'text-red-100',
      label: '🚨 Critical Error',
      bgGradient: 'from-red-800 to-red-900',
      textColor: 'text-white',
    },
  };

  const config = severityConfig[robotError.severity?.toUpperCase()] || severityConfig['HIGH'];
  const IconComponent = config.icon;
  const isCritical = robotError.severity?.toUpperCase() === 'CRITICAL';

  return (
    <div 
      className={`fixed ${isCritical ? 'inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50' : 'top-20 left-4 right-4 z-40'}`}
    >
      <div className={`${isCritical ? 'w-full max-w-md' : 'w-full'} bg-gradient-to-r ${config.bgGradient} border-l-4 ${config.border} p-4 rounded ${isCritical ? 'rounded-lg shadow-2xl' : 'shadow-lg'} ${config.textColor || ''}`}>
        <div className="flex items-start gap-3">
          <IconComponent className={`w-6 h-6 ${config.color} flex-shrink-0 mt-1`} />
          <div className="flex-1">
            <div className={`font-bold ${config.color}`}>
              {config.label}
            </div>
            <div className={`text-sm ${config.color} font-semibold mt-1`}>
              {robotError.error_code}
            </div>
            <div className={`text-sm ${isCritical ? 'text-red-100' : 'text-gray-700'} mt-1`}>
              {robotError.error_message}
            </div>
            <div className={`text-xs ${isCritical ? 'text-red-200' : 'text-gray-500'} mt-2`}>
              {new Date(robotError.timestamp).toLocaleTimeString()}
            </div>

            {/* Auto-dismiss countdown for non-critical errors */}
            {!isCritical && (
              <div className="mt-3 text-xs text-gray-600">
                Auto-dismissing in 5 seconds...
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => clearRobotError()}
            className={`flex-shrink-0 p-1 rounded-md hover:opacity-80 transition-opacity ${
              isCritical 
                ? 'text-red-200 hover:bg-red-800' 
                : `${config.color} hover:bg-opacity-20`
            }`}
            aria-label="Close error"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action buttons for CRITICAL errors */}
        {isCritical && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => clearRobotError()}
              className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded font-medium transition-colors"
            >
              Acknowledge
            </button>
            <button
              onClick={() => {
                // Send INTERRUPT command
                const { send } = useWebSocketStore.getState();
                send('INTERRUPT', { robot_id: 'RB001' });
                clearRobotError();
              }}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-medium transition-colors"
            >
              Stop Robot
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
