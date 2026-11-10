import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/uiStore';
import { useSettingsStore } from '../store/settingsStore';
import { vw, vh, vmin, clamp } from '../hooks/useResponsive';
import { PrimaryButton } from './PrimaryButton';

const PIN_CODE = '1234'; // Mock PIN

export const PinModal = () => {
  const { showPinModal, pinCallback, pinTitle, closePinModal } = useUIStore();
  const t = useSettingsStore(state => state.t);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        setTimeout(() => {
          if (newPin === PIN_CODE) {
            if (pinCallback) pinCallback();
            closePinModal();
            setPin('');
          } else {
            setError(true);
            setPin('');
          }
        }, 200);
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const handleClose = () => {
    closePinModal();
    setPin('');
    setError(false);
  };

  return (
    <AnimatePresence>
      {showPinModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-overlay z-50"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed z-50 bg-card-bg rounded-3xl shadow-2xl"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: vw(35),
              maxWidth: '400px',
              minWidth: '300px',
              padding: `${vh(3)} ${vw(2)}`,
            }}
          >
            <h3 
              className="text-text-primary font-bold text-center mb-6"
              style={{ fontSize: clamp(18, 2, 24) }}
            >
              {pinTitle}
            </h3>

            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: pin.length > i ? 1 : 0.8,
                    backgroundColor: error ? '#FF3B30' : pin.length > i ? '#007AFF' : '#D1D1D6',
                  }}
                  className="rounded-full"
                  style={{
                    width: vw(2),
                    height: vw(2),
                    minWidth: '16px',
                    minHeight: '16px',
                  }}
                />
              ))}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-danger text-center mb-4 font-medium"
                style={{ fontSize: clamp(12, 1.2, 16) }}
              >
                {t('Incorrect PIN')}
              </motion.p>
            )}

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <motion.button
                  key={num}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleNumberClick(num.toString())}
                  className="bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-text-primary transition-colors"
                  style={{
                    height: vh(7),
                    fontSize: clamp(18, 2, 28),
                  }}
                >
                  {num}
                </motion.button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <PrimaryButton variant="ghost" onClick={handleClear}>
                {t('Clear')}
              </PrimaryButton>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleNumberClick('0')}
                className="bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-text-primary transition-colors"
                style={{
                  height: vh(7),
                  fontSize: clamp(18, 2, 28),
                }}
              >
                0
              </motion.button>
              <PrimaryButton variant="ghost" onClick={handleClose}>
                {t('Cancel')}
              </PrimaryButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
