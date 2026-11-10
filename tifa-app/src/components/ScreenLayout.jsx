import React from 'react';
import { BurgerButton } from './BurgerButton';

export const ScreenLayout = ({ children, showBurger = true }) => {
  return (
    <div className="w-screen h-screen flex flex-row bg-gray-50 overflow-hidden">
      {showBurger && <BurgerButton />}
      {children}
    </div>
  );
};
