import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, Reorder } from "framer-motion";
import { ScreenLayout } from "../../components/ScreenLayout";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useMusicStore } from "../../store/musicStore";
import { useUIStore } from "../../store/uiStore";
import { vw, vh, clamp } from "../../hooks/useResponsive";
import { TrashIcon, PlusIcon } from "../../components/Icons";

export const PlaylistEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playlists, tracks, reorderPlaylistTracks, addTrackToPlaylist } =
    useMusicStore();
  const { addToast } = useUIStore();

  const playlist = playlists.find((p) => p.id === parseInt(id, 10));
  const [playlistTracks, setPlaylistTracks] = useState(
    playlist?.tracks || []
  );

  if (!playlist) {
    return (
      <ScreenLayout>
        <div className="flex-1 flex items-center justify-center bg-bg">
          <p className="text-text-secondary">Playlist not found</p>
        </div>
      </ScreenLayout>
    );
  }

  const handleReorder = (newOrder) => {
    setPlaylistTracks(newOrder);
    reorderPlaylistTracks(playlist.id, newOrder);
  };

  const handleRemoveTrack = (trackName) => {
    const newTracks = playlistTracks.filter((t) => t !== trackName);
    setPlaylistTracks(newTracks);
    reorderPlaylistTracks(playlist.id, newTracks);
    addToast({ type: "success", message: "Track removed" });
  };

  const handleAddTrack = (trackName) => {
    addTrackToPlaylist(playlist.id, trackName);
    setPlaylistTracks([...playlistTracks, trackName]);
    addToast({ type: "success", message: "Track added" });
  };

  const availableTracks = tracks.filter(
    (t) => !playlistTracks.includes(t.name)
  );

  return (
    <ScreenLayout>
      <div className="flex-1 flex bg-bg">
        {/* LEFT: PLAYLIST TRACKS */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div
            className="bg-card-bg border-b border-card-border flex items-center justify-between"
            style={{ padding: `${vh(2)} ${vw(3)}` }}
          >
            <div>
              <h2
                className="font-bold text-text-primary"
                style={{ fontSize: clamp(20, 2.2, 28) }}
              >
                {playlist.name}
              </h2>
              <p
                className="text-text-secondary mt-1"
                style={{ fontSize: clamp(13, 1.3, 17) }}
              >
                {playlistTracks.length} tracks
              </p>
            </div>

            <PrimaryButton
              variant="ghost"
              onClick={() => navigate("/music/playlists")}
            >
              Done
            </PrimaryButton>
          </div>

          {/* List */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ padding: `${vh(2)} ${vw(3)}` }}
          >
            {playlistTracks.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p
                  className="text-text-secondary"
                  style={{ fontSize: clamp(14, 1.4, 18) }}
                >
                  No tracks in playlist. Add tracks from the right panel.
                </p>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={playlistTracks}
                onReorder={handleReorder}
                className="space-y-2"
              >
                {playlistTracks.map((trackName, index) => {
                  const track = tracks.find((t) => t.name === trackName);
                  const duration =
                    track?.duration != null
                      ? `${Math.floor(track.duration / 60)}:${(
                          track.duration % 60
                        )
                          .toString()
                          .padStart(2, "0")}`
                      : "--:--";

                  return (
                    <Reorder.Item
                      key={trackName}
                      value={trackName}
                      className="bg-card-bg rounded-xl border border-card-border cursor-grab active:cursor-grabbing"
                      style={{ padding: `${vh(1.5)} ${vw(2)}` }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Drag handle */}
                        <div className="flex flex-col gap-1 opacity-50">
                          <div className="w-1 h-1 bg-text-secondary rounded-full" />
                          <div className="w-1 h-1 bg-text-secondary rounded-full" />
                          <div className="w-1 h-1 bg-text-secondary rounded-full" />
                        </div>

                        {/* Index bubble */}
                        <div
                          className="flex items-center justify-center bg-primary text-white rounded-full font-bold"
                          style={{
                            width: vw(2.8),
                            height: vw(2.8),
                            minWidth: 30,
                            minHeight: 30,
                            fontSize: clamp(12, 1.2, 16),
                          }}
                        >
                          {index + 1}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-semibold text-text-primary truncate"
                            style={{ fontSize: clamp(13, 1.3, 17) }}
                          >
                            {track?.name || trackName}
                          </p>
                          <p
                            className="text-text-secondary"
                            style={{ fontSize: clamp(11, 1.1, 14) }}
                          >
                            {duration} • {track?.size || "--"}
                          </p>
                        </div>

                        {/* Delete */}
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveTrack(trackName)}
                          className="p-2 rounded-lg hover:bg-danger/10 transition-colors flex items-center justify-center"
                        >
                          <TrashIcon size={2} color="#FF3B30" />
                        </motion.button>
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            )}
          </div>
        </div>

        {/* RIGHT: AVAILABLE TRACKS */}
        <div
          className="bg-card-bg border-l border-card-border flex flex-col"
          style={{ width: vw(30) }}
        >
          <div
            className="border-b border-card-border"
            style={{ padding: `${vh(2)} ${vw(2)}` }}
          >
            <h3
              className="font-bold text-text-primary"
              style={{ fontSize: clamp(16, 1.8, 22) }}
            >
              Available Tracks
            </h3>
          </div>

          <div
            className="flex-1 overflow-y-auto"
            style={{ padding: `${vh(2)} ${vw(2)}` }}
          >
            {availableTracks.length === 0 ? (
              <div className="text-center text-text-secondary">
                <p style={{ fontSize: clamp(13, 1.3, 17) }}>
                  All tracks are already in this playlist.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableTracks.map((track) => {
                  const duration = `${Math.floor(track.duration / 60)}:${(
                    track.duration % 60
                  )
                    .toString()
                    .padStart(2, "0")}`;

                  return (
                    <motion.button
                      key={track.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAddTrack(track.name)}
                      className="w-full bg-bg hover:bg-gray-100 rounded-xl text-left border border-card-border transition-colors"
                      style={{ padding: `${vh(1.5)} ${vw(1.5)}` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <PlusIcon size={2} color="#007AFF" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-semibold text-text-primary truncate"
                            style={{ fontSize: clamp(13, 1.3, 16) }}
                          >
                            {track.name}
                          </p>
                          <p
                            className="text-text-secondary"
                            style={{ fontSize: clamp(11, 1.1, 13) }}
                          >
                            {duration}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
};
