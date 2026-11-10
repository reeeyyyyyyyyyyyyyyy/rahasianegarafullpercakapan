import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { useSettingsStore } from '../store/settingsStore';
import { vw, vh, vmin, clamp } from '../hooks/useResponsive';
import { 
  CloseIcon, TrayIcon, TargetIcon, WalkIcon, WaveIcon,
  SparklesIcon, CakeIcon, ReturnIcon, MusicIcon, SettingsIcon 
} from './Icons';

const modes = [
  { id: 'delivery', name: 'Delivery', path: '/delivery', Icon: TrayIcon },
  { id: 'direct', name: 'Direct', path: '/direct', Icon: TargetIcon },
  { id: 'cruise', name: 'Cruise', path: '/cruise', Icon: WalkIcon },
  { id: 'guide', name: 'Guide', path: '/guide', Icon: WaveIcon },
  { id: 'special', name: 'Special', path: '/special', Icon: SparklesIcon },
  { id: 'return', name: 'Return', path: '/return', Icon: ReturnIcon },
  { id: 'music', name: 'Music', path: '/music', Icon: MusicIcon },
  { id: 'settings', name: 'Settings', path: '/settings', Icon: SettingsIcon },
];

export const ModeMenuPopup = () => {
  const navigate = useNavigate();
  const { showModeMenu, closeModeMenu } = useUIStore();
  const t = useSettingsStore(state => state.t);

  const handleModeSelect = (path) => {
    navigate(path);
    closeModeMenu();
  };

  return (
    <AnimatePresence>
      {showModeMenu && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeModeMenu}
            className="fixed inset-0 bg-black/40 z-40"
            style={{ backdropFilter: 'blur(4px)' }}
          />
          
          {/* Modal - Centered */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{
                width: vw(65),
                maxWidth: '700px',
                maxHeight: vh(80),
              }}
            >
              {/* Header */}
              <div 
                className="flex items-center justify-between px-6 py-4 border-b border-gray-200"
              >
                <h2 
                  className="text-gray-900 font-semibold"
                  style={{ fontSize: clamp(18, 2.2, 26) }}
                >
                </h2>
                <button
                  onClick={closeModeMenu}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <CloseIcon size={2.2} color="#6B7280" strokeWidth={2} />
                </button>
              </div>

              {/* Content */}
              <div 
                className="p-6 overflow-y-auto"
                style={{ maxHeight: vh(65) }}
              >
                <div 
                  className="grid grid-cols-3 gap-3"
                  style={{ gap: vw(1.5) }}
                >
                  {modes.map((mode, index) => (
                    <motion.button
                      key={mode.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                      onClick={() => handleModeSelect(mode.path)}
                      className="flex flex-col items-center justify-center p-5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all"
                      style={{
                        height: vh(14),
                      }}
                    >
                      <mode.Icon size={4.5} color="#232a34ff" strokeWidth={2} />
                      <span 
                        className="font-medium text-gray-700 mt-3"
                        style={{ 
                          fontSize: clamp(13, 1.5, 18),
                        }}
                      >
                        {t(mode.name)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
