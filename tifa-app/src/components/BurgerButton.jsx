import React from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '../store/uiStore';
import { vw, vh } from '../hooks/useResponsive';
import { MenuIcon } from './Icons';

export const BurgerButton = () => {
  const openModeMenu = useUIStore((state) => state.openModeMenu);

  return (
    <motion.button
      onClick={openModeMenu}
      whileTap={{ scale: 0.95 }}
      className="fixed z-50 bg-gray-600 shadow-sm flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all"
      style={{
        top: vh(0),
        right: vw(0),
        width: vw(4.5),
        height: vw(4.5),
        minWidth: '50px',
        minHeight: '50px',
        borderBottomLeftRadius: "1.2rem",
      }}
    >
      <MenuIcon size={2.5} color="#232a34ff" strokeWidth={2} />
    </motion.button>
  );
};
