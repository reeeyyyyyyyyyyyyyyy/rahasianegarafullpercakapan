// src/database/indexedDB.js
import Dexie from 'dexie';

export const db = new Dexie('TifaAppDB');

// Define schema (only tables actually used)
// Version 1: Initial schema
db.version(1).stores({
  maps: '++map_id, map_name, is_active',
  destinations: '++destination_id, map_id, category_id, destination_name, is_active',
  categories: '++category_id, category_name, category_type',
  settings: 'setting_key'
});

// Version 2: Add indexes for is_home and destination_code
db.version(2).stores({
  maps: '++map_id, map_name, is_active',
  destinations: '++destination_id, map_id, category_id, destination_name, destination_code, is_active, is_home',
  categories: '++category_id, category_name, category_type',
  settings: 'setting_key'
});

// Version 3: Add robot_state table for battery and position
db.version(3).stores({
  maps: '++map_id, map_name, is_active',
  destinations: '++destination_id, map_id, category_id, destination_name, destination_code, is_active, is_home',
  categories: '++category_id, category_name, category_type',
  settings: 'setting_key',
  robot_state: 'state_key' // Store robot state (battery, position, etc.)
});

// Version 4: Add sync tracking fields for map management
// last_updated: timestamp of last server sync
// sync_flag: 0=synced, 1=pending_push, 2=local_only
db.version(4).stores({
  maps: '++map_id, map_name, is_active, last_updated, sync_flag',
  destinations: '++destination_id, map_id, category_id, destination_name, destination_code, is_active, is_home, last_updated, sync_flag',
  categories: '++category_id, category_name, category_type, last_updated, sync_flag',
  settings: 'setting_key',
  robot_state: 'state_key'
});

// Version 5: Add destination_type to track system destinations properly
db.version(5).stores({
  maps: '++map_id, map_name, is_active, last_updated, sync_flag',
  destinations: '++destination_id, map_id, category_id, destination_name, destination_code, destination_type, is_active, is_home, last_updated, sync_flag',
  categories: '++category_id, category_name, category_type, last_updated, sync_flag',
  settings: 'setting_key',
  robot_state: 'state_key'
});

// Version 6: Add expression_sounds table for configurable default sounds per expression
db.version(6).stores({
  maps: '++map_id, map_name, is_active, last_updated, sync_flag',
  destinations: '++destination_id, map_id, category_id, destination_name, destination_code, destination_type, is_active, is_home, last_updated, sync_flag',
  categories: '++category_id, category_name, category_type, last_updated, sync_flag',
  settings: 'setting_key',
  robot_state: 'state_key',
  expression_sounds: 'expression_type' // PK = expression type name (happy, sad, etc.)
});

/**
 * Default sound mapping for each expression type.
 * sound_type: 'builtin' uses AudioService.playNotification()
 * sound_type: 'file' uses a user-uploaded audio file (stored as Blob in file_blob)
 */
const DEFAULT_EXPRESSION_SOUNDS = [
  { expression_type: 'neutral',   sound_type: 'builtin', builtin_sound: 'chime',   file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'happy',     sound_type: 'builtin', builtin_sound: 'success', file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'sad',       sound_type: 'builtin', builtin_sound: 'warning', file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'angry',     sound_type: 'builtin', builtin_sound: 'alert',   file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'surprised', sound_type: 'builtin', builtin_sound: 'arrival', file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'wink',      sound_type: 'builtin', builtin_sound: 'chime',   file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'tired',     sound_type: 'builtin', builtin_sound: 'chime',   file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'sleepy',    sound_type: 'builtin', builtin_sound: 'chime',   file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'smile',     sound_type: 'builtin', builtin_sound: 'success', file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'laugh',     sound_type: 'builtin', builtin_sound: 'success', file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'confused',  sound_type: 'builtin', builtin_sound: 'warning', file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'relieved',  sound_type: 'builtin', builtin_sound: 'chime',   file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'energized', sound_type: 'builtin', builtin_sound: 'success', file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'sparkle',   sound_type: 'builtin', builtin_sound: 'arrival', file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'dizzy',     sound_type: 'builtin', builtin_sound: 'warning', file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'broken',    sound_type: 'builtin', builtin_sound: 'alert',   file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'sceptic',   sound_type: 'builtin', builtin_sound: 'warning', file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'crazy',     sound_type: 'builtin', builtin_sound: 'alert',   file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'love',      sound_type: 'builtin', builtin_sound: 'arrival', file_path: null, file_name: null, file_blob: null, enabled: true },
  { expression_type: 'denying',   sound_type: 'builtin', builtin_sound: 'warning', file_path: null, file_name: null, file_blob: null, enabled: true },
];


// Lock to prevent concurrent seeding
let isSeeding = false;

// Seed initial data
export async function seedDatabase() {
  // Prevent concurrent seeding
  if (isSeeding) {
    return;
  }

  const count = await db.destinations.count();
  if (count > 0) {
    // Destinations already seeded — but ensure expression_sounds table is populated
    // (handles upgrade from v5 → v6 where destinations exist but expression_sounds doesn't)
    try {
      const exprCount = await db.expression_sounds.count();
      if (exprCount === 0) {
        await db.expression_sounds.bulkAdd(DEFAULT_EXPRESSION_SOUNDS);
        console.log('✅ Expression sounds seeded (upgrade path)');
      }
    } catch (e) {
      console.error('Failed to seed expression_sounds on upgrade:', e);
    }
    return; // Already seeded
  }

  isSeeding = true;

  try {
    // Seed categories
    await db.categories.bulkAdd([
      { category_name: 'All Destinations', category_type: 'custom', color: '#6b7280', sort_order: 0, is_active: 1 },
      { category_name: 'Dish Serving Port', category_type: 'dish-serving', color: '#3b82f6', sort_order: 1, is_active: 1 },
      { category_name: 'Dish Washing Room', category_type: 'washing', color: '#8b5cf6', sort_order: 2, is_active: 1 },
      { category_name: 'Collecting Port', category_type: 'collecting', color: '#10b981', sort_order: 3, is_active: 1 }
    ]);

    // Seed maps
    await db.maps.bulkAdd([
      { map_name: 'Restaurant Floor 1', description: 'Main dining area', map_floor: '1', is_active: 1 },
      { map_name: 'Restaurant Floor 2', description: 'VIP area', map_floor: '2', is_active: 0 }
    ]);

    // Seed destinations with explicit IDs
    await db.destinations.bulkAdd([
      { destination_id: 10, map_id: 1, category_id: 2, destination_name: 'Destination 1', destination_code: 'DST001', x: 2.54, y: 2.04, yaw: 0.0, zone: 'A', is_home: 0, is_active: 1 },
      { destination_id: 11, map_id: 1, category_id: 2, destination_name: 'Destination 2', destination_code: 'DST002', x: 1.30, y: 2.59, yaw: 1.57, zone: 'A', is_home: 0, is_active: 1 },
      { destination_id: 12, map_id: 1, category_id: 2, destination_name: 'Destination 3', destination_code: 'DST003', x: 1.49, y: 1.87, yaw: 1.57, zone: 'B', is_home: 0, is_active: 1 },
      { destination_id: 999, map_id: 1, category_id: null, destination_name: 'Home Base', destination_code: 'HOME', x: 0.0, y: 0.0, yaw: 0.0, zone: 'A', is_home: 1, is_active: 1 },
      { destination_id: 998, map_id: 1, category_id: null, destination_name: 'Charging Station', destination_code: 'CHARGE', x: 5.0, y: 5.0, yaw: 1.57, zone: 'A', is_home: 0, is_active: 1 }
    ]);

    // Seed settings (UI ID and Robot ID are now free-form text input)
    await db.settings.bulkAdd([
      { setting_key: 'ws_url', setting_value: 'wss://tifa-ws.example.com', setting_type: 'string' },
      { setting_key: 'ui_id', setting_value: 'UI_TIFA_001', setting_type: 'string' },
      { setting_key: 'robot_id', setting_value: 'RB001', setting_type: 'string' },
      { setting_key: 'map_id', setting_value: '1', setting_type: 'number' },
      { setting_key: 'master_volume', setting_value: '80', setting_type: 'number' },
      { setting_key: 'voice_volume', setting_value: '100', setting_type: 'number' },
      { setting_key: 'music_volume', setting_value: '60', setting_type: 'number' },
      { setting_key: 'language', setting_value: 'en', setting_type: 'string' }
    ]);

    // Seed expression sounds (default sound for each expression type)
    await db.expression_sounds.bulkAdd(DEFAULT_EXPRESSION_SOUNDS);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    isSeeding = false;
  }
}

// Reset database (clear all data and re-seed)
export async function resetDatabase() {
  await db.destinations.clear();
  await db.categories.clear();
  await db.maps.clear();
  await db.settings.clear();
  await db.expression_sounds.clear();
  await seedDatabase();
}