import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ScreenLayout } from "../../components/ScreenLayout";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SearchBar } from "../../components/SearchBar";
import { useMusicStore } from "../../store/musicStore";
import { useUIStore } from "../../store/uiStore";
import { vw, vh, clamp } from "../../hooks/useResponsive";
import { EditIcon, TrashIcon, PlusIcon } from "../../components/Icons";

export const PlaylistsPage = () => {
  const navigate = useNavigate();
  const { playlists, deletePlaylist, createPlaylist } = useMusicStore();
  const { openPinModal, addToast } = useUIStore();
  const [search, setSearch] = useState("");

  const filteredPlaylists = playlists.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    const name = prompt("Enter playlist name:");
    if (name) {
      createPlaylist(name);
      addToast({
        type: "success",
        title: "Created",
        message: `Playlist "${name}" created`,
      });
    }
  };

  const handleDelete = (playlist) => {
    openPinModal(() => {
      deletePlaylist(playlist.id);
      addToast({
        type: "success",
        title: "Deleted",
        message: `Playlist "${playlist.name}" deleted`,
      });
    }, "Enter PIN to Delete");
  };

  return (
    <ScreenLayout>
      <div className="flex-1 flex flex-col bg-bg">
        {/* HEADER */}
        <div
          className="bg-card-bg border-b border-card-border flex items-center justify-between"
          style={{ padding: `${vh(2)} ${vw(3)}` }}
        >
          <div className="flex-1">
            <h2
              className="font-bold text-text-primary"
              style={{ fontSize: clamp(20, 2.2, 28) }}
            >
              Playlists
            </h2>
            <p
              className="text-text-secondary mt-1"
              style={{ fontSize: clamp(13, 1.3, 17) }}
            >
              Manage your music playlists
            </p>
          </div>

          <PrimaryButton
            variant="primary"
            onClick={handleCreate}
            icon={<PlusIcon size={2} color="white" />}
          >
            New Playlist
          </PrimaryButton>
        </div>

        {/* SEARCH BAR */}
        <div style={{ padding: `${vh(2)} ${vw(3)}` }}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search playlists..."
          />
        </div>

        {/* PLAYLIST GRID */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: `0 ${vw(3)} ${vh(2)} ${vw(3)}` }}
        >
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${vw(
                18
              )}px, 1fr))`,
              gap: vw(2),
            }}
          >
            {filteredPlaylists.map((playlist, index) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="bg-card-bg rounded-2xl shadow-md border border-card-border overflow-hidden cursor-pointer flex flex-col"
                onClick={() => navigate(`/music/playlist/${playlist.id}`)}
              >
                {/* Thumbnail */}
                <div
                  className="flex items-center justify-center bg-gradient-to-br from-primary/80 to-gray-500 text-white"
                  style={{ height: vh(14) }}
                >
                  <span style={{ fontSize: clamp(36, 4, 56) }}>🎵</span>
                </div>

                {/* Info */}
                <div style={{ padding: `${vh(1.5)} ${vw(1.5)}` }}>
                  <h3
                    className="font-bold text-text-primary mb-1 truncate"
                    style={{ fontSize: clamp(14, 1.5, 18) }}
                  >
                    {playlist.name}
                  </h3>
                  <p
                    className="text-text-secondary mb-3"
                    style={{ fontSize: clamp(11, 1.1, 14) }}
                  >
                    {playlist.tracks.length} tracks
                  </p>

                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/music/playlist/${playlist.id}`);
                      }}
                      className="flex-1 p-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center"
                    >
                      <EditIcon size={2} color="white" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(playlist);
                      }}
                      className="p-2 bg-danger text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                      <TrashIcon size={2} color="white" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredPlaylists.length === 0 && (
              <div className="col-span-full flex items-center justify-center py-10">
                <p
                  className="text-text-secondary"
                  style={{ fontSize: clamp(13, 1.3, 17) }}
                >
                  No playlists found.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
};
