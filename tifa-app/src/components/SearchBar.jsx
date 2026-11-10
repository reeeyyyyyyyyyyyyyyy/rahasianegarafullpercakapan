import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { vw, vh, vmin, clamp } from '../hooks/useResponsive';
import { SearchIcon, CloseIcon } from './Icons';

export const SearchBar = ({ 
  value, 
  onChange, 
  placeholder = 'Search...',
  onClear,
  className = '',
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
  };

  return (
    <motion.div
      animate={{ 
        scale: isFocused ? 1.02 : 1,
        borderColor: isFocused ? '#007AFF' : '#D1D1D6',
      }}
      className={`
        relative flex items-center gap-2
        bg-white border-2 rounded-lg
        transition-all duration-200
        ${className}
      `}
      style={{
        padding: `${vh(1)} ${vw(1.5)}`,
        height: vh(6),
      }}
      {...props}
    >
      <SearchIcon size={2} color="#8E8E93" />
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-text-primary placeholder-text-secondary"
        style={{
          fontSize: clamp(14, 1.4, 18),
        }}
      />

      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleClear}
            className="flex items-center justify-center hover:opacity-70 transition-opacity"
            whileTap={{ scale: 0.9 }}
          >
            <CloseIcon size={2} color="#8E8E93" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
