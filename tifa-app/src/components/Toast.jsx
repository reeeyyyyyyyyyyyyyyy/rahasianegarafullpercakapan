import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/uiStore';
import { vw, vh, vmin, clamp } from '../hooks/useResponsive';
import { CheckIcon, CloseIcon } from './Icons';

export const Toast = () => {
  const { toasts, removeToast } = useUIStore();

  useEffect(() => {
    // Create timers for each toast
    const timers = toasts.map((toast) => {
      return setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration || 5000); // Default 5 seconds
    });
    
    // Cleanup all timers
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  return (
    <div 
      className="fixed z-[100] pointer-events-none"
      style={{
        top: vh(8),
        right: vw(2),
        display: 'flex',
        flexDirection: 'column',
        gap: vh(1),
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white border border-gray-200 rounded-xl shadow-lg flex items-center gap-3 pointer-events-auto"
            style={{
              padding: `${vh(1.5)} ${vw(2)}`,
              minWidth: vw(20),
              maxWidth: vw(30),
            }}
          >
            {toast.type === 'success' && (
              <div className="flex-shrink-0">
                <CheckIcon size={2.2} color="#10B981" strokeWidth={2.5} />
              </div>
            )}
            {toast.type === 'error' && (
              <div className="flex-shrink-0">
                <CloseIcon size={2.2} color="#EF4444" strokeWidth={2.5} />
              </div>
            )}
            
            <div className="flex-1">
              {toast.title && (
                <p 
                  className="font-medium text-gray-900"
                  style={{ fontSize: clamp(13, 1.3, 16) }}
                >
                  {toast.title}
                </p>
              )}
              <p 
                className="text-gray-600"
                style={{ fontSize: clamp(12, 1.2, 14) }}
              >
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-gray-100 p-1 rounded transition-colors"
            >
              <CloseIcon size={1.8} color="#9CA3AF" strokeWidth={2} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
