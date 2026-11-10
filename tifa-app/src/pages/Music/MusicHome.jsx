import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ScreenLayout } from "../../components/ScreenLayout";
import { vw, vh, clamp } from "../../hooks/useResponsive";

import {
  MusicIcon,
  FolderIcon,
  ImportIcon,
  VolumeIcon
} from "../../components/Icons";

const tiles = [
  // { id: "playlists", label: "Playlists", icon: MusicIcon, path: "/music/playlists" },
  // { id: "files", label: "Music Files", icon: FolderIcon, path: "/music/files" },
  // { id: "import", label: "Import", icon: ImportIcon, path: "/music/import" },
  { id: "expression-sounds", label: "Expression Sounds", icon: VolumeIcon, path: "/music/expression-sounds" },
];

export const MusicHome = () => {
  const navigate = useNavigate();

  return (
    <ScreenLayout>
      <div className="flex-1 flex flex-col bg-bg items-center">

        {/* Title Bar */}
        <div
          className="bg-card-bg border-b border-card-border w-full"
          style={{ padding: `${vh(2)} ${vw(3)}` }}
        >
          <h2
            className="font-bold text-text-primary"
            style={{ fontSize: clamp(20, 2.2, 28) }}
          >
            Music
          </h2>
          <p
            className="text-text-secondary mt-1"
            style={{ fontSize: clamp(13, 1.3, 17) }}
          >
            Manage playlists, files, and import music
          </p>
        </div>

        {/* Tiles Row */}
        <div
          className="flex items-center justify-center gap-6"
          style={{ marginTop: vh(5) }}
        >
          {tiles.map((tile, i) => {
            const Icon = tile.icon;

            return (
              <motion.button
                key={tile.id}
                onClick={() => navigate(tile.path)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                className="bg-card-bg border border-card-border rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-all"
                style={{
                  width: vw(18),
                  height: vw(16),
                  minWidth: "180px",
                  minHeight: "160px",
                  padding: `${vh(2)} ${vw(1.5)}`,
                }}
              >
                <Icon size={3.2} color="#232A34FF" />

                <p
                  className="font-medium text-text-primary mt-3"
                  style={{ fontSize: clamp(14, 1.4, 18) }}
                >
                  {tile.label}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </ScreenLayout>
  );
};
