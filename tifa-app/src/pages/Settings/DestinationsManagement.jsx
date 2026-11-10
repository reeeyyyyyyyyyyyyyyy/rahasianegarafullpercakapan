import React, { useState, useEffect } from 'react';
import { db } from '../../database/indexedDB';
import { clamp } from '../../hooks/useResponsive';
import { useUIStore } from '../../store/uiStore';

export const DestinationsManagement = () => {
  const [destinations, setDestinations] = useState([]);
  const [maps, setMaps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterMapId, setFilterMapId] = useState(''); // Added filter state
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    destination_id: '',
    destination_name: '',
    x: '',
    y: '',
    yaw: '',
    map_id: '',
    category_id: '',
    is_active: 1,
    is_home: 0,
    destination_code: ''
  });
  const { openConfirmDialog } = useUIStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [destData, mapsData, categoriesData, activeMap] = await Promise.all([
        db.destinations.toArray(),
        db.maps.toArray(),
        db.categories.toArray(),
        db.settings.get('map_id')
      ]);
      setDestinations(destData);
      setMaps(mapsData);
      setCategories(categoriesData);
      
      // If no filter is set yet and an active map exists, set it as default
      if (activeMap?.setting_value && filterMapId === '') {
        setFilterMapId(activeMap.setting_value);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      destination_id: '',
      destination_name: '',
      x: '',
      y: '',
      yaw: '',
      map_id: '',
      category_id: '',
      is_active: 1,
      is_home: 0,
      destination_code: ''
    });
  };

  const handleEdit = (dest) => {
    setIsAdding(true);
    setEditingId(dest.destination_id);
    setFormData({
      destination_id: dest.destination_id,
      destination_name: dest.destination_name,
      x: dest.x ?? '',
      y: dest.y ?? '',
      yaw: dest.yaw ?? '',
      map_id: dest.map_id ?? '',
      category_id: dest.category_id ?? '',
      is_active: dest.is_active,
      is_home: dest.is_home ?? 0,
      destination_code: dest.destination_code ?? ''
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      destination_id: '',
      destination_name: '',
      x: '',
      y: '',
      yaw: '',
      map_id: '',
      category_id: '',
      is_active: 1,
      is_home: 0,
      destination_code: ''
    });
  };

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.destination_id || !formData.destination_name) {
        openConfirmDialog('Validation Error', 'Destination ID and Name are required!', null);
        return;
      }

      const destId = Number(formData.destination_id);
      if (isNaN(destId)) {
        openConfirmDialog('Validation Error', 'Destination ID must be a number!', null);
        return;
      }

      // Check duplicate ID (only for new or if ID changed)
      if (editingId === null || editingId !== destId) {
        const existing = await db.destinations.get(destId);
        if (existing) {
          openConfirmDialog('Duplicate ID', `Destination ID ${destId} already exists!`, null);
          return;
        }
      }

      // Validate coordinates if provided
      if (formData.x !== '' && isNaN(Number(formData.x))) {
        openConfirmDialog('Validation Error', 'X coordinate must be a number!', null);
        return;
      }
      if (formData.y !== '' && isNaN(Number(formData.y))) {
        openConfirmDialog('Validation Error', 'Y coordinate must be a number!', null);
        return;
      }
      if (formData.yaw !== '' && isNaN(Number(formData.yaw))) {
        openConfirmDialog('Validation Error', 'Yaw must be a number!', null);
        return;
      }

      // Validate foreign keys
      if (formData.map_id !== '') {
        const mapExists = await db.maps.get(Number(formData.map_id));
        if (!mapExists) {
          openConfirmDialog('Validation Error', 'Selected Map ID does not exist!', null);
          return;
        }
      }
      if (formData.category_id !== '') {
        const categoryExists = await db.categories.get(Number(formData.category_id));
        if (!categoryExists) {
          openConfirmDialog('Validation Error', 'Selected Category ID does not exist!', null);
          return;
        }
      }

      const destData = {
        destination_id: destId,
        destination_name: formData.destination_name.trim(),
        x: formData.x !== '' ? Number(formData.x) : null,
        y: formData.y !== '' ? Number(formData.y) : null,
        yaw: formData.yaw !== '' ? Number(formData.yaw) : null,
        map_id: formData.map_id !== '' ? Number(formData.map_id) : null,
        category_id: formData.category_id !== '' ? Number(formData.category_id) : null,
        is_active: formData.is_active,
        is_home: formData.is_home,
        destination_code: formData.destination_code.trim() || null
      };

      if (editingId !== null && editingId !== destId) {
        // ID changed - delete old and add new
        await db.destinations.delete(editingId);
        await db.destinations.add(destData);
      } else if (editingId !== null) {
        // Update existing
        await db.destinations.put(destData);
      } else {
        // Add new
        await db.destinations.add(destData);
      }

      await loadData();
      handleCancel();
      
      openConfirmDialog('Success', `Destination ${editingId !== null ? 'updated' : 'added'} successfully!`, null);
    } catch (error) {
      console.error('Error saving destination:', error);
      openConfirmDialog('Error', `Failed to save destination: ${error.message}`, null);
    }
  };

  const handleDelete = (dest) => {
    openConfirmDialog(
      'Delete Destination',
      `Are you sure you want to delete "${dest.destination_name}"?`,
      async () => {
        try {
          await db.destinations.delete(dest.destination_id);
          await loadData();
          openConfirmDialog('Success', 'Destination deleted successfully!', null);
        } catch (error) {
          console.error('Error deleting destination:', error);
          openConfirmDialog('Error', `Failed to delete destination: ${error.message}`, null);
        }
      }
    );
  };

  const getMapName = (mapId) => {
    const map = maps.find(m => m.map_id === mapId);
    return map ? map.map_name : '-';
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.category_id === categoryId);
    return category ? category.category_name : '-';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: clamp(18, 2, 24) }} className="font-bold text-gray-800">
          Destinations Management
        </h2>
        {!isAdding && (
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            style={{ fontSize: clamp(12, 1.3, 15) }}
          >
            + Add Destination
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-600">
          <h3 style={{ fontSize: clamp(14, 1.5, 18) }} className="font-semibold text-gray-700 mb-4">
            {editingId !== null ? 'Edit Destination' : 'Add New Destination'}
          </h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label style={{ fontSize: clamp(11, 1.2, 14) }} className="block text-gray-600 font-medium mb-2">
                Destination ID *
              </label>
              <input
                type="number"
                value={formData.destination_id}
                onChange={(e) => setFormData({...formData, destination_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                style={{ fontSize: clamp(12, 1.3, 15) }}
                placeholder="e.g., 1"
              />
            </div>
            
            <div className="col-span-2">
              <label style={{ fontSize: clamp(11, 1.2, 14) }} className="block text-gray-600 font-medium mb-2">
                Destination Name *
              </label>
              <input
                type="text"
                value={formData.destination_name}
                onChange={(e) => setFormData({...formData, destination_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                style={{ fontSize: clamp(12, 1.3, 15) }}
                placeholder="e.g., Reception Desk"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label style={{ fontSize: clamp(11, 1.2, 14) }} className="block text-gray-600 font-medium mb-2">
                X Coordinate
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.x}
                onChange={(e) => setFormData({...formData, x: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                style={{ fontSize: clamp(12, 1.3, 15) }}
                placeholder="e.g., 1.5"
              />
            </div>
            
            <div>
              <label style={{ fontSize: clamp(11, 1.2, 14) }} className="block text-gray-600 font-medium mb-2">
                Y Coordinate
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.y}
                onChange={(e) => setFormData({...formData, y: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                style={{ fontSize: clamp(12, 1.3, 15) }}
                placeholder="e.g., 2.3"
              />
            </div>

            <div>
              <label style={{ fontSize: clamp(11, 1.2, 14) }} className="block text-gray-600 font-medium mb-2">
                Yaw (Rotation)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.yaw}
                onChange={(e) => setFormData({...formData, yaw: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                style={{ fontSize: clamp(12, 1.3, 15) }}
                placeholder="e.g., 0.0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{ fontSize: clamp(11, 1.2, 14) }} className="block text-gray-600 font-medium mb-2">
                Map
              </label>
              <select
                value={formData.map_id}
                onChange={(e) => setFormData({...formData, map_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                style={{ fontSize: clamp(12, 1.3, 15) }}
              >
                <option value="">-- Select Map --</option>
                {maps.filter(m => m.is_active).map(map => (
                  <option key={map.map_id} value={map.map_id}>
                    {map.map_name} (ID: {map.map_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: clamp(11, 1.2, 14) }} className="block text-gray-600 font-medium mb-2">
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                style={{ fontSize: clamp(12, 1.3, 15) }}
              >
                <option value="">-- Select Category --</option>
                {categories.filter(c => c.is_active).map(category => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name} (ID: {category.category_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{ fontSize: clamp(11, 1.2, 14) }} className="block text-gray-600 font-medium mb-2">
                Destination Code
              </label>
              <input
                type="text"
                value={formData.destination_code}
                onChange={(e) => setFormData({...formData, destination_code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                style={{ fontSize: clamp(12, 1.3, 15) }}
                placeholder="e.g., CHARGE, HOMEBASE"
              />
              <p style={{ fontSize: clamp(9, 1, 11) }} className="text-gray-500 mt-1">
                Special codes: CHARGE, HOMEBASE, etc.
              </p>
            </div>
          </div>

          <div className="flex gap-4 mb-4">
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

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_home === 1}
                onChange={(e) => setFormData({...formData, is_home: e.target.checked ? 1 : 0})}
                className="w-4 h-4"
              />
              <span style={{ fontSize: clamp(11, 1.2, 14) }} className="text-gray-600 font-medium">
                Home Position
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

      {/* Destinations List */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: clamp(12, 1.3, 15) }} className="font-semibold text-gray-700">Filter by Map:</span>
            <select
              value={filterMapId}
              onChange={(e) => setFilterMapId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
              style={{ fontSize: clamp(12, 1.3, 15), minWidth: '200px' }}
            >
              <option value="">All Maps</option>
              {maps.map(map => (
                <option key={map.map_id} value={map.map_id}>
                  {map.map_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th style={{ fontSize: clamp(11, 1.2, 14) }} className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
              <th style={{ fontSize: clamp(11, 1.2, 14) }} className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
              <th style={{ fontSize: clamp(11, 1.2, 14) }} className="px-4 py-3 text-left font-semibold text-gray-700">Coords (X, Y, Yaw)</th>
              <th style={{ fontSize: clamp(11, 1.2, 14) }} className="px-4 py-3 text-left font-semibold text-gray-700">Map</th>
              <th style={{ fontSize: clamp(11, 1.2, 14) }} className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
              <th style={{ fontSize: clamp(11, 1.2, 14) }} className="px-4 py-3 text-left font-semibold text-gray-700">Code</th>
              <th style={{ fontSize: clamp(11, 1.2, 14) }} className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th style={{ fontSize: clamp(11, 1.2, 14) }} className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {destinations.filter(d => filterMapId === '' || String(d.map_id) === String(filterMapId)).length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                  {filterMapId === '' 
                    ? 'No destinations found. Click "Add Destination" to create one.' 
                    : 'No destinations found for this map.'}
                </td>
              </tr>
            ) : (
              destinations
                .filter(d => filterMapId === '' || String(d.map_id) === String(filterMapId))
                .map((dest) => (
                <tr key={dest.destination_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td style={{ fontSize: clamp(12, 1.3, 15) }} className="px-4 py-3 text-gray-800">{dest.destination_id}</td>
                  <td style={{ fontSize: clamp(12, 1.3, 15) }} className="px-4 py-3 text-gray-800">
                    {dest.destination_name}
                    {dest.is_home === 1 && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Home</span>
                    )}
                  </td>
                  <td style={{ fontSize: clamp(11, 1.2, 13) }} className="px-4 py-3 text-gray-600">
                    {dest.x !== null && dest.y !== null && dest.yaw !== null 
                      ? `(${dest.x.toFixed(2)}, ${dest.y.toFixed(2)}, ${dest.yaw.toFixed(2)})` 
                      : '-'}
                  </td>
                  <td style={{ fontSize: clamp(11, 1.2, 13) }} className="px-4 py-3 text-gray-600">{getMapName(dest.map_id)}</td>
                  <td style={{ fontSize: clamp(11, 1.2, 13) }} className="px-4 py-3 text-gray-600">{getCategoryName(dest.category_id)}</td>
                  <td style={{ fontSize: clamp(11, 1.2, 13) }} className="px-4 py-3 text-gray-600">
                    {dest.destination_code || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dest.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {dest.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(dest)}
                        className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(dest)}
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
