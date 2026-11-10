import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScreenLayout } from '../../components/ScreenLayout';
import { vw, vh, clamp } from '../../hooks/useResponsive';

import {
  Settings, Wifi, Map, Volume2, MessageSquare, Gauge,
  Grid3x3, Layers, Upload, Info, Bug, Database, MapPin, FolderTree, Cable
} from 'lucide-react';

// Sidebar Menu
const settingsMenu = [
  { id: 'basic', label: 'Basic', icon: Settings, path: '/settings/basic' },
  { id: 'communication', label: 'Communication', icon: Cable, path: '/settings/communication' },
  { id: 'wlan', label: 'WLAN', icon: Wifi, path: '/settings/wlan' },
  { id: 'map', label: 'Map', icon: Map, path: '/settings/map' },
  { id: 'volume', label: 'Volume', icon: Volume2, path: '/settings/volume' },
  { id: 'voice', label: 'Voice', icon: MessageSquare, path: '/settings/voice' },
  { id: 'speed', label: 'Speed', icon: Gauge, path: '/settings/speed' },
  { id: 'dotmatrix', label: 'Dot Matrix', icon: Grid3x3, path: '/settings/dotmatrix' },
  { id: 'tray', label: 'Tray Settings', icon: Layers, path: '/settings/tray' },
  { id: 'update', label: 'Software Update', icon: Upload, path: '/settings/update' },
  { id: 'category', label: 'Categories', icon: FolderTree, path: '/settings/category' },
  { id: 'maps', label: 'Maps Management', icon: Database, path: '/settings/maps' },
  { id: 'destinations', label: 'Destinations', icon: MapPin, path: '/settings/destinations' },
  { id: 'about', label: 'About', icon: Info, path: '/settings/about' },
  { id: 'debug', label: 'Debug', icon: Bug, path: '/settings/debug' },
];

export const SettingsLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <ScreenLayout>

      {/* LEFT SIDEBAR */}
      <div
        className="bg-white border-r border-gray-300 flex flex-col flex-shrink-0"
        style={{ width: vw(22), minWidth: '180px', maxWidth: '240px' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-300">
          <h2
            className="font-bold text-gray-800"
            style={{ fontSize: clamp(16, 1.6, 22) }}
          >
            Settings
          </h2>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto py-2">
          {settingsMenu.map((item) => {
            const active = isActive(item.path);

            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 mb-1 
                  transition-all rounded-md

                  ${active
                    ? "bg-gray-300 text-gray-900 border-l-4 border-gray-700 pl-4"
                    : "text-gray-700 hover:bg-gray-100"}
                `}
              >
                <item.icon size={18} className="flex-shrink-0" />
                <span className="font-medium truncate" style={{ fontSize: clamp(11, 1.2, 14) }}>{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 bg-gray-100 overflow-y-auto p-6">
        <div className='mt-12'>
          <Outlet />
        </div>
      </div>

    </ScreenLayout>
  );
};
