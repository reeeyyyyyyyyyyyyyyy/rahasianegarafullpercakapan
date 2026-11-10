import React, { useState, useEffect } from 'react';
import { db } from '../../database/indexedDB';
import { clamp } from '../../hooks/useResponsive';
import { useUIStore } from '../../store/uiStore';

export const MapManagement = () => {
  const [maps, setMaps] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    map_id: '',
    map_name: '',
    is_active: 1
  });
  const { openConfirmDialog } = useUIStore();

  useEffect(() => {
    loadMaps();
  }, []);

  const loadMaps = async () => {
    try {
      const data = await db.maps.toArray();
      setMaps(data);
    } catch (error) {
      console.error('Error loading maps:', error);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      map_id: '',
      map_name: '',
      is_active: 1
    });
  };

  const handleEdit = (map) => {
    setIsAdding(true);
    setEditingId(map.map_id);
    setFormData({
      map_id: map.map_id,
      map_name: map.map_name,
      is_active: map.is_active
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      map_id: '',
      map_name: '',
      is_active: 1
    });
  };

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.map_id || !formData.map_name) {
        openConfirmDialog('Validation Error', 'Map ID and Name are required!', null);
        return;
      }

      const mapId = Number(formData.map_id);
      if (isNaN(mapId)) {
        openConfirmDialog('Validation Error', 'Map ID must be a number!', null);
        return;
      }

      // Check duplicate ID (only for new or if ID changed)
      if (editingId === null || editingId !== mapId) {
        const existing = await db.maps.get(mapId);
        if (existing) {
          openConfirmDialog('Duplicate ID', `Map ID ${mapId} already exists!`, null);
          return;
        }
      }

      const mapData = {
        map_id: mapId,
        map_name: formData.map_name.trim(),
        is_active: formData.is_active
      };

      if (editingId !== null && editingId !== mapId) {
        // ID changed - delete old and add new
        await db.maps.delete(editingId);
        await db.maps.add(mapData);
      } else if (editingId !== null) {
        // Update existing
        await db.maps.put(mapData);
      } else {
        // Add new
        await db.maps.add(mapData);
      }

      await loadMaps();
      handleCancel();
      
      openConfirmDialog('Success', `Map ${editingId !== null ? 'updated' : 'added'} successfully!`, null);
    } catch (error) {
      console.error('Error saving map:', error);
      openConfirmDialog('Error', `Failed to save map: ${error.message}`, null);
    }
  };

  const handleDelete = (map) => {
    openConfirmDialog(
      'Delete Map',
      `Are you sure you want to delete "${map.map_name}"?\n\nNote: This may affect destinations using this map!`,
      async () => {
        try {
          await db.maps.delete(map.map_id);
          await loadMaps();
          openConfirmDialog('Success', 'Map deleted successfully!', null);
        } catch (error) {
          console.error('Error deleting map:', error);
          openConfirmDialog('Error', `Failed to delete map: ${error.message}`, null);
        }
      }
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: clamp(18, 2, 24) }} className="font-bold text-gray-800">
          Map Management
        </h2>
        {!isAdding && (
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            style={{ fontSize: clamp(12, 1.3, 15) }}
          >
            + Add Map
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-600">
          <h3 style={{ fontSize: clamp(14, 1.5, 18) }} className="font-semibold text-gray-700 mb-4">
            {editingId !== null ? 'Edit Map' : 'Add New Map'}
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{ fontSize: clamp(11, 1.2, 14) }} className="block text-gray-600 font-medium mb-2">
                Map ID *
              </label>
              <input
                type="number"
                value={formData.map_id}
                onChange={(e) => setFormData({...formData, map_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                style={{ fontSize: clamp(12, 1.3, 15) }}
                placeholder="e.g., 1"
              />
            </div>
            
            <div>
              <label style={{ fontSize: clamp(11, 1.2, 14) }} className="block text-gray-600 font-medium mb-2">
                Map Name *
              </label>
              <input
                type="text"
                value={formData.map_name}
                onChange={(e) => setFormData({...formData, map_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                style={{ fontSize: clamp(12, 1.3, 15) }}
                placeholder="e.g., Floor 1"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active === 1}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
                className="w-4 h-4"
              />
              <span style={{ fontSize: clamp(11, 1.2, 14) }} className="text-gray-600 font-medium">
                Active
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              style={{ fontSize: clamp(12, 1.3, 15) }}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              style={{ fontSize: clamp(12, 1.3, 15) }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Maps List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th style={{ fontSize: clamp(11, 1.2, 14) }} className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
              <th style={{ fontSize: clamp(11, 1.2, 14) }} className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
              <th style={{ fontSize: clamp(11, 1.2, 14) }} className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th style={{ fontSize: clamp(11, 1.2, 14) }} className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {maps.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-gray-400">
                  No maps found. Click "Add Map" to create one.
                </td>
              </tr>
            ) : (
              maps.map((map) => (
                <tr key={map.map_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td style={{ fontSize: clamp(12, 1.3, 15) }} className="px-4 py-3 text-gray-800">{map.map_id}</td>
                  <td style={{ fontSize: clamp(12, 1.3, 15) }} className="px-4 py-3 text-gray-800">{map.map_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      map.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {map.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(map)}
                        className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(map)}
                        className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
