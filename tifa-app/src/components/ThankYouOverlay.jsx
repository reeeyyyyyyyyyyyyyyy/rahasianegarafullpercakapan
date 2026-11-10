import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/uiStore';
import { useSettingsStore } from '../store/settingsStore';
import { vw, clamp } from '../hooks/useResponsive';

export const ThankYouOverlay = () => {
  const { showThankYou, thankYouMessage, hideThankYou } = useUIStore();
  const t = useSettingsStore(state => state.t);

  // Auto dismiss after 2 seconds
  useEffect(() => {
    if (showThankYou) {
      const timer = setTimeout(() => {
        hideThankYou();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showThankYou, hideThankYou]);

  return (
    <AnimatePresence>
      {showThankYou && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={hideThankYou}
          className="fixed inset-0 bg-gradient-to-br from-gray-700/95 to-gray-800/95 z-[250] flex flex-col items-center justify-center cursor-pointer"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          {/* Animated Check Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.1
            }}
            className="mb-8"
          >
            <motion.svg 
              width={vw(12)} 
              height={vw(12)} 
              viewBox="0 0 100 100" 
              className="text-white"
            >
              {/* Circle background */}
              <motion.circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
              {/* Checkmark */}
              <motion.path
                d="M 25 50 L 42 67 L 75 34"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              />
            </motion.svg>
          </motion.div>

          {/* Thank You Text */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white font-bold mb-4 text-center"
            style={{ fontSize: clamp(32, 4, 56) }}
          >
            {t('Thank You!')}
          </motion.h1>

          {/* Message */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/80 text-center"
            style={{ fontSize: clamp(16, 1.8, 24) }}
          >
            {thankYouMessage}
          </motion.p>

          {/* Tap to dismiss hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 text-white/50 text-center"
            style={{ fontSize: clamp(12, 1.2, 16) }}
          >
            {t('Tap anywhere to dismiss')}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
