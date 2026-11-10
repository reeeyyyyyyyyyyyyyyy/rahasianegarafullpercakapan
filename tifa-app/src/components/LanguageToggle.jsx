import React from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../store/settingsStore';

const LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'id', label: 'ID', full: 'Indonesia' },
  { code: 'ja', label: 'JA', full: '日本語' },
  { code: 'zh', label: 'ZH', full: '中文' },
  { code: 'ko', label: 'KO', full: '한국어' },
];

export const LanguageToggle = () => {
  const { settings, setSetting } = useSettingsStore();
  const currentLang = settings?.language || 'en';

  const currentIndex = LANGUAGES.findIndex(l => l.code === currentLang);
  const current = LANGUAGES[currentIndex] || LANGUAGES[0];

  const cycleLanguage = async (e) => {
    e.stopPropagation();
    const nextIndex = (currentIndex + 1) % LANGUAGES.length;
    const nextLang = LANGUAGES[nextIndex];
    await setSetting('language', nextLang.code, 'string');
  };

  return (
    <motion.button
      onClick={cycleLanguage}
      whileTap={{ scale: 0.9 }}
      className="fixed z-50 flex items-center justify-center shadow-lg transition-all"
      style={{
        bottom: '20px',
        left: '20px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: '#374151',
        minWidth: '56px',
      }}
      title={current.full}
    >
      <span
        className="text-white font-bold"
        style={{ fontSize: '14px' }}
      >
        {current.label}
      </span>
    </motion.button>
  );
};
