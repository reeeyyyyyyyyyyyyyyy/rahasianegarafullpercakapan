import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/uiStore';
import { useSettingsStore } from '../store/settingsStore';
import { vw, vh, vmin, clamp } from '../hooks/useResponsive';
import { PrimaryButton } from './PrimaryButton';

export const ConfirmDialog = () => {
  const { 
    showConfirmDialog, 
    confirmTitle, 
    confirmMessage, 
    confirmOnConfirm,
    confirmOnCancel,
    closeConfirmDialog 
  } = useUIStore();
  const t = useSettingsStore(state => state.t);

  const handleConfirm = () => {
    if (confirmOnConfirm) {
      confirmOnConfirm();
    }
    closeConfirmDialog();
  };
  
  const handleCancel = () => {
    if (confirmOnCancel) {
      confirmOnCancel();
    }
    closeConfirmDialog();
  };

  return (
    <AnimatePresence>
      {showConfirmDialog && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeConfirmDialog}
            className="fixed inset-0 bg-black/40 z-[250]"
            style={{ backdropFilter: 'blur(4px)' }}
          />
          
          {/* Dialog - Centered */}
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{
                width: vw(55),
                maxWidth: '700px',
                minWidth: '450px',
              }}
            >
              <div 
                className="p-8"
                style={{
                  padding: `${vh(4.5)} ${vw(4.5)}`,
                }}
              >
                <h3 
                  className="text-gray-900 font-bold mb-4"
                  style={{ fontSize: clamp(22, 2.5, 32) }}
                >
                  {confirmTitle}
                </h3>
                
                <p 
                  className="text-gray-600 mb-8 whitespace-pre-line leading-relaxed"
                  style={{ fontSize: clamp(16, 1.8, 20) }}
                >
                  {confirmMessage}
                </p>

                <div className="flex gap-4">
                  <PrimaryButton
                    variant="ghost"
                    onClick={handleCancel}
                    fullWidth
                    style={{ fontSize: clamp(15, 1.7, 19), padding: `${vh(1.8)} ${vw(3)}` }}
                  >
                    {confirmOnCancel ? t('No') : t('Cancel')}
                  </PrimaryButton>
                  <PrimaryButton
                    variant="primary"
                    onClick={handleConfirm}
                    fullWidth
                    style={{ fontSize: clamp(15, 1.7, 19), padding: `${vh(1.8)} ${vw(3)}` }}
                  >
                    {confirmOnCancel ? t('Yes') : t('Confirm')}
                  </PrimaryButton>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
