import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/uiStore';
import { useWebSocketStore } from '../store/websocketStore';
import { useSettingsStore } from '../store/settingsStore';
import { vw, vh, clamp } from '../hooks/useResponsive';

export const DeliveryOverlay = () => {
  const { showDeliveryOverlay, deliveryOverlayTitle, deliveryOverlaySubtitle } = useUIStore();
  const { sendInterrupt, isConnected } = useWebSocketStore();
  const t = useSettingsStore(state => state.t);

  const handleOverlayClick = () => {
    if (!isConnected) return;
    
    // Send INTERRUPT to WebSocket
    sendInterrupt();
  };

  return (
    <AnimatePresence>
      {showDeliveryOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 bg-gradient-to-br from-gray-800/95 to-gray-900/95 z-[200] flex flex-col items-center justify-center cursor-pointer"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          {/* Animated Robot Icon */}
          <motion.div
            animate={{
              y: [0, -20, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="mb-8"
          >
            <svg width={vw(15)} height={vw(15)} viewBox="0 0 100 100" className="text-white">
              <circle cx="50" cy="50" r="35" fill="currentColor" opacity="0.2"/>
              <circle cx="50" cy="50" r="25" fill="currentColor"/>
              <circle cx="40" cy="45" r="4" fill="#1e293b"/>
              <circle cx="60" cy="45" r="4" fill="#1e293b"/>
              <path d="M 35 60 Q 50 70 65 60" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round"/>
            </svg>
          </motion.div>

          {/* Main Text */}
          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white font-bold mb-4 text-center"
            style={{ fontSize: clamp(28, 3.5, 48) }}
          >
            {deliveryOverlayTitle}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/80 text-center mb-8"
            style={{ fontSize: clamp(16, 1.8, 22) }}
          >
            {deliveryOverlaySubtitle}
          </motion.p>

          {/* Animated Dots Loader */}
          <div className="flex gap-3 mb-12">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-4 h-4 bg-white rounded-full"
              />
            ))}
          </div>

          {/* Tap to Cancel */}
          <motion.div
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="text-white/60 text-center"
            style={{ fontSize: clamp(14, 1.5, 18) }}
          >
            {t('Tap screen to cancel')}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
