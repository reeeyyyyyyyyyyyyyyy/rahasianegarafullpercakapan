// src/store/destinationStore.js
import { create } from 'zustand';
import { db, seedDatabase } from '../database/indexedDB';

export const useDestinationStore = create((set, get) => ({
  destinations: [],
  loading: false,
  error: null,

  loadDestinations: async (filters = {}) => {
    set({ loading: true, error: null });

    try {
      // Get active map ID to prevent mismatch across all modes
      const activeMapSetting = await db.settings.get('map_id');
      const activeMapId = activeMapSetting?.setting_value ? Number(activeMapSetting.setting_value) : null;

      // Prioritize activeMapId over any hardcoded filters.mapId
      const targetMapId = activeMapId || filters.mapId;

      let query = db.destinations;

      if (targetMapId) {
        query = query.where('map_id').equals(targetMapId);
      }

      if (filters.isActive !== undefined) {
        query = query.filter(d => d.is_active === filters.isActive);
      }

      if (filters.categoryId) {
        query = query.filter(d => d.category_id === filters.categoryId);
      }

      // Filter out system destinations (home base & charging station)
      // unless explicitly requested with includeSystem: true
      if (!filters.includeSystem) {
        query = query.filter(d =>
          d.destination_type !== 'CHARGE' &&
          d.destination_type !== 'HOME'
        );
      }

      const destinations = await query.toArray();

      // Enrich with category info
      const enriched = await Promise.all(
        destinations.map(async (dest) => {
          const category = dest.category_id
            ? await db.categories.get(dest.category_id)
            : null;

          return {
            ...dest,
            id: dest.destination_id, // Add alias for compatibility
            name: dest.destination_name,
            category_name: category?.category_name || null,
            category_type: category?.category_type || null
          };
        })
      );

      set({ destinations: enriched, loading: false });

      return enriched;
    } catch (error) {
      console.error('[DestinationStore] Error loading destinations:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  getDestinationCoords: (destinationName) => {
    const { destinations } = get();
    const dest = destinations.find(d => d.destination_name === destinationName);
    return dest ? { x: dest.x, y: dest.y, yaw: dest.yaw } : null;
  },

  getHomeBase: async () => {
    const activeMapSetting = await db.settings.get('map_id');
    const activeMapId = activeMapSetting?.setting_value ? Number(activeMapSetting.setting_value) : null;

    if (activeMapId) {
      // Find the home base specifically for the active map using destination_type ONLY
      const allActiveMapDestinations = await db.destinations.where('map_id').equals(activeMapId).toArray();
      return allActiveMapDestinations.find(d => d.destination_type === 'HOME') || null;
    }
    const allDests = await db.destinations.toArray();
    return allDests.find(d => d.destination_type === 'HOME') || null;
  }
}));