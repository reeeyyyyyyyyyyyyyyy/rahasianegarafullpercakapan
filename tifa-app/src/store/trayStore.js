import { create } from 'zustand';
import { db } from '../database/indexedDB';

const defaultTrays = [
  { id: 1, name: 'Tray 1', capacity: 4, enabled: true, weight: 5, color: '#FF6B6B' },
  { id: 2, name: 'Tray 2', capacity: 4, enabled: true, weight: 5, color: '#4ECDC4' },
  { id: 3, name: 'Tray 3', capacity: 4, enabled: true, weight: 5, color: '#45B7D1' },
  { id: 4, name: 'Tray 4', capacity: 4, enabled: true, weight: 5, color: '#95E1D3' },
];

// Load trays from IndexedDB
const loadTraysFromDB = async () => {
  try {
    const settings = await db.settings.where('setting_key').equals('trays').first();
    if (settings?.setting_value) {
      const savedTrays = JSON.parse(settings.setting_value);
      
      if (savedTrays.length === 3) {
        const upgradedTrays = [
          ...savedTrays,
          { id: 4, name: 'Tray 4', capacity: 4, enabled: true, weight: 5, color: '#95E1D3' }
        ];
        // Save upgraded trays back to DB
        await db.settings.put({
          setting_key: 'trays',
          setting_value: JSON.stringify(upgradedTrays),
          setting_type: 'json',
          updated_at: new Date().toISOString()
        });
        return upgradedTrays;
      }
      
      return savedTrays;
    }
    return defaultTrays;
  } catch (error) {
    console.error('[TrayStore] Error loading trays:', error);
    return defaultTrays;
  }
};

// Save trays to IndexedDB
const saveTraysToDb = async (trays) => {
  try {
    await db.settings.put({
      setting_key: 'trays',
      setting_value: JSON.stringify(trays),
      setting_type: 'json',
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[TrayStore] Error saving trays:', error);
  }
};

export const useTrayStore = create((set, get) => ({
  trays: defaultTrays,
  
  // Initialize trays from DB
  initTrays: async () => {
    const trays = await loadTraysFromDB();
    set({ trays });
  },
  
  // Update tray properties (e.g., enabled/disabled)
  updateTray: (trayId, updates) => set((state) => {
    const newTrays = state.trays.map(t => t.id === trayId ? { ...t, ...updates } : t);
    saveTraysToDb(newTrays);
    return { trays: newTrays };
  }),
}));
