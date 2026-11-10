import React, { useEffect } from 'react';
import { Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { useWebSocketStore } from '../store/websocketStore';

/**
 * Robot Initialization Progress Component
 * Shows real-time initialization status
 */
export default function RobotInitDisplay() {
  const { robotInit, isRobotInitializing } = useWebSocketStore();

  if (!isRobotInitializing || !robotInit) return null;

  const statusConfig = {
    'INITIALIZING': {
      bg: 'from-blue-500 to-cyan-500',
      icon: Zap,
      message: 'Robot Initializing...',
      color: 'text-blue-600',
    },
    'CHECKING_HARDWARE': {
      bg: 'from-purple-500 to-pink-500',
      icon: Zap,
      message: 'Checking Hardware...',
      color: 'text-purple-600',
    },
    'CHECKING_SENSORS': {
      bg: 'from-indigo-500 to-blue-500',
      icon: Zap,
      message: 'Checking Sensors...',
      color: 'text-indigo-600',
    },
    'READY': {
      bg: 'from-green-500 to-emerald-500',
      icon: CheckCircle,
      message: 'Robot Ready!',
      color: 'text-green-600',
    },
    'ERROR': {
      bg: 'from-red-500 to-orange-500',
      icon: AlertCircle,
      message: 'Initialization Error',
      color: 'text-red-600',
    },
  };

  const config = statusConfig[robotInit.status] || statusConfig['INITIALIZING'];
  const IconComponent = config.icon;

  // Animation for progress bar
  const progressPercentage = robotInit.status === 'READY' ? 100 : 66;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          <div className={`bg-gradient-to-r ${config.bg} p-4 rounded-full`}>
            <IconComponent className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className={`text-center text-2xl font-bold ${config.color} mb-2`}>
          {config.message}
        </h2>

        {/* Status Detail */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600 font-semibold">
            {robotInit.init_message || 'Initializing robot systems...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6 overflow-hidden">
          <div
            className={`bg-gradient-to-r ${config.bg} h-full transition-all duration-500`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* Status Steps */}
        <div className="space-y-3 mb-6">
          <StepIndicator
            label="Initializing"
            active={robotInit.status !== undefined}
            completed={['CHECKING_HARDWARE', 'CHECKING_SENSORS', 'READY', 'ERROR'].includes(robotInit.status)}
          />
          <StepIndicator
            label="Checking Hardware"
            active={['CHECKING_HARDWARE', 'CHECKING_SENSORS', 'READY'].includes(robotInit.status)}
            completed={['CHECKING_SENSORS', 'READY'].includes(robotInit.status)}
          />
          <StepIndicator
            label="Checking Sensors"
            active={['CHECKING_SENSORS', 'READY'].includes(robotInit.status)}
            completed={robotInit.status === 'READY'}
          />
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-500 text-center">
          {new Date(robotInit.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

/**
 * Step Indicator Component
 */
function StepIndicator({ label, active, completed }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          completed
            ? 'bg-green-500'
            : active
              ? 'bg-blue-500 animate-pulse'
              : 'bg-gray-300'
        }`}
      >
        {completed && <CheckCircle className="w-4 h-4 text-white" />}
        {active && !completed && <Zap className="w-3 h-3 text-white" />}
      </div>
      <span className={`text-sm ${completed ? 'text-green-600 font-semibold' : active ? 'text-blue-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}
