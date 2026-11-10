import { create } from 'zustand';

const mockPlaylists = [
  { id: 1, name: 'Arrival', tracks: ['welcome.mp3', 'greeting.mp3'] },
  { id: 2, name: 'Birthday', tracks: ['happy-birthday.mp3', 'celebration.mp3'] },
  { id: 3, name: 'Delivery', tracks: ['delivery-1.mp3', 'delivery-2.mp3'] },
  { id: 4, name: 'Special', tracks: ['special-event.mp3'] },
];

const mockTracks = [
  { id: 1, name: 'welcome.mp3', duration: 120, size: '2.4 MB' },
  { id: 2, name: 'greeting.mp3', duration: 90, size: '1.8 MB' },
  { id: 3, name: 'happy-birthday.mp3', duration: 150, size: '3.0 MB' },
  { id: 4, name: 'celebration.mp3', duration: 180, size: '3.6 MB' },
  { id: 5, name: 'delivery-1.mp3', duration: 60, size: '1.2 MB' },
  { id: 6, name: 'delivery-2.mp3', duration: 75, size: '1.5 MB' },
  { id: 7, name: 'special-event.mp3', duration: 200, size: '4.0 MB' },
];

export const useMusicStore = create((set) => ({
  playlists: mockPlaylists,
  tracks: mockTracks,
  currentPlaylist: null,
  editingPlaylist: null,
  
  setCurrentPlaylist: (playlistId) => set({ currentPlaylist: playlistId }),
  
  setEditingPlaylist: (playlistId) => set({ editingPlaylist: playlistId }),
  
  createPlaylist: (name) => set((state) => ({
    playlists: [
      ...state.playlists,
      { id: Date.now(), name, tracks: [] },
    ],
  })),
  
  updatePlaylist: (playlistId, updates) => set((state) => ({
    playlists: state.playlists.map(p => 
      p.id === playlistId ? { ...p, ...updates } : p
    ),
  })),
  
  deletePlaylist: (playlistId) => set((state) => ({
    playlists: state.playlists.filter(p => p.id !== playlistId),
  })),
  
  addTrackToPlaylist: (playlistId, trackName) => set((state) => ({
    playlists: state.playlists.map(p =>
      p.id === playlistId
        ? { ...p, tracks: [...p.tracks, trackName] }
        : p
    ),
  })),
  
  reorderPlaylistTracks: (playlistId, newTracks) => set((state) => ({
    playlists: state.playlists.map(p =>
      p.id === playlistId ? { ...p, tracks: newTracks } : p
    ),
  })),
}));
