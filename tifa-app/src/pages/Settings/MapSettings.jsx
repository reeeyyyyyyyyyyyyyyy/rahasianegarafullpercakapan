import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../database/indexedDB';
import { useWebSocketStore } from '../../store/websocketStore';
import { useSettingsStore } from '../../store/settingsStore';
import { apiFetch } from '../../services/apiClient';

/**
 * MapSettings Page
 *
 * Allows the operator to:
 * 1. View all available maps from the backend
 * 2. Select a map → syncs destinations + categories to IndexedDB
 * 3. Sends MAP_SELECTED via WebSocket to notify the backend
 * 4. Downloads map files and pushes them to the robot via ADB
 */
export default function MapSettings() {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');

  const sendMapSelected = useWebSocketStore((s) => s.sendMapSelected);
  const { settings } = useSettingsStore.getState();

  // ─── Load maps from BE + current map_id from DB ─────────────────────────

  const loadMaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/maps');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setMaps(json.maps || []);
    } catch (e) {
      setError(`Failed to load maps: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentMapId = useCallback(async () => {
    try {
      const setting = await db.settings.get('map_id');
      if (setting?.setting_value) {
        setSelectedMapId(Number(setting.setting_value));
      }
    } catch (e) {
      // no map in DB yet — ok
    }
  }, []);

  useEffect(() => {
    loadMaps();
    loadCurrentMapId();
  }, [loadMaps, loadCurrentMapId]);

  // ─── Map selection ────────────────────────────────────────────────────────

  const handleSelectMap = useCallback(async (mapId) => {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    setStatus('Fetching map details…');

    try {
      // 1. Fetch map details (destinations + categories)
      const detailsRes = await apiFetch(`/api/maps/${mapId}/details`);
      if (!detailsRes.ok) throw new Error(`HTTP ${detailsRes.status}`);
      const { map, destinations, categories } = await detailsRes.json();

      const now = Date.now();

      // 2. Repopulate IndexedDB — clear old map data and insert fresh
      setStatus('Syncing map data to local database…');
      await db.transaction('rw', db.maps, db.destinations, db.categories, db.settings, async () => {
        // Mark all maps inactive, then activate the selected one
        await db.maps.clear();
        await db.maps.bulkPut(
          [{ ...map, map_id: map.map_id, is_active: 1, last_updated: now, sync_flag: 0 }]
        );

        // Clear and repopulate destinations for this map
        await db.destinations.where('map_id').equals(mapId).delete();
        await db.destinations.bulkPut(
          destinations.map((d) => ({
            destination_id: d.goal_id,
            map_id: mapId,
            category_id: d.category_id ?? null,
            destination_name: d.goal_name,
            destination_code: d.goal_code,
            destination_type: d.goal_type,
            x: d.x,
            y: d.y,
            yaw: d.yaw,
            is_home: d.goal_type === 'HOME' ? 1 : 0,
            is_active: 1,
            last_updated: now,
            sync_flag: 0,
          }))
        );

        // Repopulate categories
        await db.categories.clear();
        await db.categories.bulkPut(
          categories.map((c) => ({
            category_id: c.category_id,
            category_name: c.category_name,
            category_type: c.category_type,
            color: c.color ?? '#6b7280',
            last_updated: now,
            sync_flag: 0,
          }))
        );

        // Save active map_id to settings
        await db.settings.put({ setting_key: 'map_id', setting_value: String(mapId), setting_type: 'number' });
      });

      setSelectedMapId(mapId);

      // 3. Notify backend via WebSocket
      setStatus('Notifying backend via WebSocket…');
      sendMapSelected(mapId);

      // 4. Download map ZIP and push to robot via ADB
      setStatus('Downloading map files…');
      await pushMapToRobot(mapId);

      setStatus(`✅ Map "${map.map_name}" activated (${destinations.length} destinations)`);
    } catch (e) {
      setError(`Failed to select map: ${e.message}`);
      setStatus('');
    } finally {
      setSyncing(false);
    }
  }, [syncing, sendMapSelected]);

  // ─── ADB push ─────────────────────────────────────────────────────────────

  const pushMapToRobot = async (mapId) => {
    try {
      const robotId = settings?.robot_id;
      if (!robotId) {
        console.warn('[MapSettings] No robot_id set — skipping ADB push');
        return;
      }

      const zipRes = await apiFetch(`/api/maps/${mapId}/download/zip`);
      if (!zipRes.ok) throw new Error(`ZIP download failed: HTTP ${zipRes.status}`);

      const zipBytes = await zipRes.arrayBuffer();

      // Fetch map download info to get server-side file paths (pgmUrl, yamlUrl)
      let mapPath = null;
      let mapName = null;
      try {
        // Try numeric ID first via details endpoint (already fetched map object is in outer scope)
        // Fallback: derive path from pgmUrl returned by download API
        const downloadInfoRes = await apiFetch(`/api/maps/${mapId}/details`);
        if (downloadInfoRes.ok) {
          const detailsData = await downloadInfoRes.json();
          mapName = detailsData.map?.map_name || null;
        }

        // Also try the download endpoint (by name) to get file paths
        if (mapName) {
          const dlRes = await apiFetch(`/api/maps/${encodeURIComponent(mapName)}/download`);
          if (dlRes.ok) {
            const dlData = await dlRes.json();
            // pgmUrl contains the full server path like /data/maps/{mapId}/{version}/map.pgm
            // Extract base path by removing the filename
            if (dlData.pgmUrl) {
              mapPath = dlData.pgmUrl.replace(/\/[^/]+$/, ''); // remove /map.pgm → base path
            }
          }
        }
      } catch (pathErr) {
        console.warn('[MapSettings] Failed to fetch map path (non-fatal):', pathErr.message);
      }

      // Push as binary MAP_DATA message via ADB
      // ADBForwardService.send() accepts objects; for binary, we base64-encode
      const base64 = btoa(String.fromCharCode(...new Uint8Array(zipBytes)));
      const { default: commManager } = await import('../../services/CommunicationManager');
      commManager.send?.({
        code: 'MAP_DATA',
        data: {
          robot_id: robotId,
          map_id: mapId,
          map_name: mapName,
          path: mapPath,          // Server-side base path for map files
          format: 'zip',
          encoding: 'base64',
          payload: base64,
        },
      });

      setStatus((prev) => prev + ' | Map files pushed to robot via ADB.');
    } catch (e) {
      console.warn('[MapSettings] ADB push failed (non-fatal):', e.message);
      // Non-critical — map is still synced locally
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px', maxWidth: '720px' }}>
      <h2 style={{ marginBottom: '8px' }}>Map Management</h2>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>
        Select the active map. Destinations and categories will sync to local storage
        and the map files will be pushed to the robot.
      </p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {status && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#16a34a' }}>
          {status}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontWeight: 600 }}>Available Maps ({maps.length})</span>
        <button
          onClick={loadMaps}
          disabled={loading}
          style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
        >
          {loading ? 'Loading…' : '🔄 Refresh'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>Loading maps…</div>
      ) : maps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>No maps available on server.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {maps.map((m) => {
            const isActive = m.map_id === selectedMapId;
            return (
              <div
                key={m.map_id}
                style={{
                  border: isActive ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isActive ? '#eff6ff' : '#fff',
                  transition: 'all 0.15s',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{m.map_name}</div>
                  <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
                    {m.destination_count ?? 0} destinations · v{m.latest_version ?? 1}
                    {m.description ? ` · ${m.description}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => handleSelectMap(m.map_id)}
                  disabled={syncing || isActive}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 7,
                    border: 'none',
                    background: isActive ? '#3b82f6' : '#f3f4f6',
                    color: isActive ? '#fff' : '#374151',
                    fontWeight: 600,
                    cursor: isActive || syncing ? 'not-allowed' : 'pointer',
                    opacity: syncing && !isActive ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {isActive ? '✓ Active' : syncing ? 'Syncing…' : 'Select'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
