// src/store/settingsStore.js
import { create } from 'zustand';
import { db, seedDatabase } from '../database/indexedDB';
import commManager from '../services/CommunicationManager';
import translations from '../utils/translations';

export const useSettingsStore = create((set, get) => ({
  settings: {},
  loading: false,

  loadSettings: async () => {
    set({ loading: true });
    
    try {
      // Query from IndexedDB (no need to seed here - App.jsx handles it)
      const allSettings = await db.settings.toArray();
      
      const settingsObj = {};
      allSettings.forEach(s => {
        settingsObj[s.setting_key] = s.setting_value;
      });

      set({ settings: settingsObj, loading: false });
      return settingsObj;
    } catch (error) {
      console.error('[SettingsStore] Error loading settings:', error);
      set({ loading: false });
      return {};
    }
  },

  getSetting: async (key) => {
    const setting = await db.settings.get(key);
    return setting?.setting_value || null;
  },

  setSetting: async (key, value, type = 'string') => {
    await db.settings.put({
      setting_key: key,
      setting_value: value,
      setting_type: type,
      updated_at: new Date().toISOString()
    });

    // Update in-memory state
    const { settings } = get();
    set({ settings: { ...settings, [key]: value } });
  },

  /**
   * Translation helper - returns translated string for current language
   * @param {string} key - English key string to translate
   * @returns {string} Translated string or original key if not found
   */
  t: (key) => {
    const { settings } = get();
    const lang = settings?.language || 'en';
    return translations[lang]?.[key] || key;
  },

  /**
   * Send robot speed setting command
   * speed_mode: "S" (Slow) | "F" (Fast) | "VF" (Very Fast)
   */
  setRobotSpeed: async (speedMode) => {
    try {
      // Validate speed mode
      const validModes = ['S', 'F', 'VF'];
      if (!validModes.includes(speedMode?.toUpperCase())) {
        console.error('[SettingsStore] Invalid speed mode:', speedMode);
        return false;
      }

      const normalizedMode = speedMode.toUpperCase();
      
      // Save to IndexedDB
      await get().setSetting('robot_speed', normalizedMode, 'string');

      // Get robot ID from settings
      const { settings } = get();
      const robotId = settings?.robot_id;
      const uiId = settings?.ui_id;

      if (!robotId) {
        console.error('[SettingsStore] Robot ID not configured');
        return false;
      }

      // Send SPEED command via WebSocket
      const payload = {
        code: 'SPEED',
        data: {
          robot_id: robotId,
          ui_id: uiId,
          speed: normalizedMode,
        },
      };

      commManager.send(payload);
      console.log(`[SettingsStore] Speed set to ${normalizedMode}`);

      return true;
    } catch (error) {
      console.error('[SettingsStore] Failed to set robot speed:', error);
      return false;
    }
  },

  /**
   * Get current robot speed setting
   */
  getRobotSpeed: async () => {
    return await get().getSetting('robot_speed') || 'F'; // Default: Fast
  },
}));