import React from 'react';
import { motion } from 'framer-motion';
import { vw, vh, vmin, clamp } from '../hooks/useResponsive';

export const SegmentedControl = ({ 
  options, 
  value, 
  onChange,
  fullWidth = false,
  className = '',
  ...props 
}) => {
  return (
    <div 
      className={`
        inline-flex bg-gray-100 rounded-lg p-1
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      style={{
        height: vh(5.5),
      }}
      {...props}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        
        return (
          <motion.button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              ${fullWidth ? 'flex-1' : ''}
              relative rounded-md font-semibold
              transition-colors duration-200
              ${isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}
            `}
            style={{
              padding: `${vh(0.5)} ${vw(2)}`,
              fontSize: clamp(12, 1.3, 16),
              minWidth: vw(8),
            }}
            whileTap={{ scale: 0.98 }}
          >
            {isActive && (
              <motion.div
                layoutId="segmented-bg"
                className="absolute inset-0 bg-white rounded-md shadow-sm"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
