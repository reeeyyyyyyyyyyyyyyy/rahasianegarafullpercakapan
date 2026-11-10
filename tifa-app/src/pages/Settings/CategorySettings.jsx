import React, { useState, useEffect } from 'react';
import { db } from '../../database/indexedDB';
import { clamp } from '../../hooks/useResponsive';
import { useUIStore } from '../../store/uiStore';

export const CategorySettings = () => {
  const [categories, setCategories] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    category_id: '',
    category_name: '',
    is_active: 1
  });
  const { openConfirmDialog } = useUIStore();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await db.categories.toArray();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      category_id: '',
      category_name: '',
      is_active: 1
    });
  };

  const handleEdit = (category) => {
    setIsAdding(true);
    setEditingId(category.category_id);
    setFormData({
      category_id: category.category_id,
      category_name: category.category_name,
      is_active: category.is_active
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      category_id: '',
      category_name: '',
      is_active: 1
    });
  };

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.category_id || !formData.category_name) {
        openConfirmDialog('Validation Error', 'Category ID and Name are required!', null);
        return;
      }

      const categoryId = Number(formData.category_id);
      if (isNaN(categoryId)) {
        openConfirmDialog('Validation Error', 'Category ID must be a number!', null);
        return;
      }

      // Check duplicate ID (only for new or if ID changed)
      if (editingId === null || editingId !== categoryId) {
        const existing = await db.categories.get(categoryId);
        if (existing) {
          openConfirmDialog('Duplicate ID', `Category ID ${categoryId} already exists!`, null);
          return;
        }
      }

      const categoryData = {
        category_id: categoryId,
        category_name: formData.category_name.trim(),
        is_active: formData.is_active
      };

      if (editingId !== null && editingId !== categoryId) {
        // ID changed - delete old and add new
        await db.categories.delete(editingId);
        await db.categories.add(categoryData);
      } else if (editingId !== null) {
        // Update existing
        await db.categories.put(categoryData);
      } else {
        // Add new
        await db.categories.add(categoryData);
      }

      await loadCategories();
      handleCancel();
      
      openConfirmDialog('Success', `Category ${editingId !== null ? 'updated' : 'added'} successfully!`, null);
    } catch (error) {
      console.error('Error saving category:', error);
      openConfirmDialog('Error', `Failed to save category: ${error.message}`, null);
    }
  };

  const handleDelete = (category) => {
    openConfirmDialog(
      'Delete Category',
      `Are you sure you want to delete "${category.category_name}"?`,
      async () => {
        try {
          await db.categories.delete(category.category_id);
          await loadCategories();
          openConfirmDialog('Success', 'Category deleted successfully!', null);
        } catch (error) {
          console.error('Error deleting category:', error);
          openConfirmDialog('Error', `Failed to delete category: ${error.message}`, null);
        }
      }
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: clamp(18, 2, 24) }} className="font-bold text-gray-800">
          Category Management
        </h2>
        {!isAdding && (
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            style={{ fontSize: clamp(12, 1.3, 15) }}
          >
            + Add Category
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-600">
          <h3 style={{ fontSize: clamp(14, 1.5, 18) }} className="font-semibold text-gray-700 mb-4">
            {editingId !== null ? 'Edit Category' : 'Add New Category'}
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{ fontSize: clamp(11, 1.2, 14) }} className="block text-gray-600 font-medium mb-2">
                Category ID *
              </label>
              <input
                type="number"
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                style={{ fontSize: clamp(12, 1.3, 15) }}
                placeholder="e.g., 1"
              />
            </div>
            
            <div>
              <label style={{ fontSize: clamp(11, 1.2, 14) }} className="block text-gray-600 font-medium mb-2">
                Category Name *
              </label>
              <input
                type="text"
                value={formData.category_name}
                onChange={(e) => setFormData({...formData, category_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                style={{ fontSize: clamp(12, 1.3, 15) }}
                placeholder="e.g., Dish Serving Port"
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

      {/* Categories List */}
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
            {categories.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-gray-400">
                  No categories found. Click "Add Category" to create one.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.category_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td style={{ fontSize: clamp(12, 1.3, 15) }} className="px-4 py-3 text-gray-800">{category.category_id}</td>
                  <td style={{ fontSize: clamp(12, 1.3, 15) }} className="px-4 py-3 text-gray-800">{category.category_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      category.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
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
