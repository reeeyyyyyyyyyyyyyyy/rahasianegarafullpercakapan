import React from 'react';
import { motion } from 'framer-motion';
import { vw, vh, vmin, clamp } from '../hooks/useResponsive';

export const PrimaryButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false,
  fullWidth = false,
  size = 'medium',
  icon = null,
  className = '',
  ...props 
}) => {
  const variants = {
    primary: 'bg-gray-900 hover:bg-gray-800 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-gray-900 hover:bg-gray-800 text-white',
    danger: 'bg-gray-900 hover:bg-gray-800 text-white',
    outline: 'border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
  };

  const sizes = {
    small: { 
      padding: `${vh(1)} ${vw(2)}`,
      fontSize: clamp(12, 1.2, 14),
      height: vh(5),
    },
    medium: { 
      padding: `${vh(1.5)} ${vw(3)}`,
      fontSize: clamp(14, 1.5, 18),
      height: vh(6.5),
    },
    large: { 
      padding: `${vh(2)} ${vw(4)}`,
      fontSize: clamp(16, 1.8, 22),
      height: vh(8),
    },
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        rounded-lg font-medium
        flex items-center justify-center gap-2
        transition-all duration-150
        ${className}
      `}
      style={{
        ...sizes[size],
        minWidth: vw(12),
      }}
      {...props}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      <span>{children}</span>
    </motion.button>
  );
};
