import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../store/settingsStore';
import { audioService } from '../services/AudioService';

export const MuteAllButton = () => {
  const [previousVolumes, setPreviousVolumes] = useState(null);
  const { settings, setSetting } = useSettingsStore();

  const masterVol = parseInt(settings?.master_volume ?? '80', 10);
  const isMuted = masterVol === 0;

  useEffect(() => {
    if (!isMuted && previousVolumes) {
      setPreviousVolumes(null);
    }
  }, [isMuted]);

  const handleMuteToggle = async (e) => {
    e.stopPropagation();
    if (isMuted) {
      const restored = previousVolumes || { master: 80, voice: 100, music: 60 };
      await Promise.all([
        setSetting('master_volume', String(restored.master), 'number'),
        setSetting('voice_volume', String(restored.voice), 'number'),
        setSetting('music_volume', String(restored.music), 'number'),
      ]);
      audioService.setVolume(restored.master / 100);
      audioService.isMuted = false;
      window.speechSynthesis.cancel();
      setPreviousVolumes(null);
    } else {
      const currentVolumes = {
        master: parseInt(settings?.master_volume ?? '80', 10),
        voice: parseInt(settings?.voice_volume ?? '100', 10),
        music: parseInt(settings?.music_volume ?? '60', 10),
      };
      setPreviousVolumes(currentVolumes);
      await Promise.all([
        setSetting('master_volume', '0', 'number'),
        setSetting('voice_volume', '0', 'number'),
        setSetting('music_volume', '0', 'number'),
      ]);
      audioService.stopAllSounds();
      window.speechSynthesis.cancel();
      audioService.setVolume(0);
      audioService.isMuted = true;
    }
  };

  return (
    <motion.button
      onClick={(e) => handleMuteToggle(e)}
      whileTap={{ scale: 0.9 }}
      className="fixed z-50 flex items-center justify-center shadow-lg transition-all"
      style={{
        bottom: '20px',
        right: '20px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: isMuted ? '#EF4444' : '#6B7280',
      }}
      title={isMuted ? 'Unmute All' : 'Mute All'}
    >
      {isMuted ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </motion.button>
  );
};
