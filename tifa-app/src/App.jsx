import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ModeMenuPopup } from './components/ModeMenuPopup';
import { ConfirmDialog } from './components/ConfirmDialog';
import { PinModal } from './components/PinModal';
import { Toast } from './components/Toast';
import { DeliveryOverlay } from './components/DeliveryOverlay';
import { ThankYouOverlay } from './components/ThankYouOverlay';
import RobotErrorDisplay from './components/RobotErrorDisplay';
import RobotInitDisplay from './components/RobotInitDisplay';
import { useWebSocketStore } from './store/websocketStore';
import { useSettingsStore } from './store/settingsStore';
import { useTrayStore } from './store/trayStore';
import { audioService } from './services/AudioService';
import { seedDatabase, resetDatabase } from './database/indexedDB';

// Expose resetDatabase to window
if (typeof window !== 'undefined') {
  window.resetDatabase = resetDatabase;
}

// Pages
import { DeliveryMode } from './pages/DeliveryMode';
import { DirectDeliveryMode } from './pages/DirectDeliveryMode';
import { CruiseMode } from './pages/CruiseMode';
import { GreetGuideMode } from './pages/GreetGuideMode';
import { SpecialMode } from './pages/SpecialMode';
import { ReturnMode } from './pages/ReturnMode';
import { MusicHome } from './pages/Music/MusicHome';
import { PlaylistsPage } from './pages/Music/PlaylistsPage';
import { PlaylistEditor } from './pages/Music/PlaylistEditor';
import { ImportMusicPage } from './pages/Music/ImportMusicPage';
import { ExpressionSoundsPage } from './pages/Music/ExpressionSoundsPage';
import { FaceExpression } from './pages/FaceExpression';
import {
  BasicSettings,
  CommunicationSettings,
  WlanSettings,
  MapSettings,
  VolumeSettings,
  VoiceSettings,
  SpeedSettings,
  DotMatrixSettings,
  TraySettings,
  UpdateSettings,
  AboutSettings,
  DebugSettings,
  SettingsLayout,
  CategorySettings,
  MapManagement,
  DestinationsManagement
} from "./pages/Settings";


// Expression Handler Component
function ExpressionHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentExpression = useWebSocketStore(state => state.currentExpression);
  const clearExpression = useWebSocketStore(state => state.clearExpression);

  useEffect(() => {
    if (currentExpression && location.pathname !== '/' && currentExpression.timestamp) {
      const previousPath = location.pathname;

      navigate('/', {
        state: {
          expressionType: currentExpression.type,
          returnPath: previousPath
        },
        replace: true
      });
    }
  }, [currentExpression?.timestamp]);

  return null;
}

function App() {
  const connect = useWebSocketStore(state => state.connect);
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const initTrays = useTrayStore(state => state.initTrays);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const initialize = async () => {
      if (isInitializedRef.current) {
        return;
      }

      isInitializedRef.current = true;

      try {
        await seedDatabase();
        await loadSettings();
        await initTrays();

        // Initialize audio service (will activate on first user interaction)
        audioService.init();

        connect();
      } catch (error) {
        console.error('[App] Initialization error:', error);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      const disconnect = useWebSocketStore.getState().disconnect;
      disconnect();
    };
  }, []); // Empty dependency - run only once on mount

  return (
    <BrowserRouter>
      <ExpressionHandler />
      <Routes>
        {/* Home */}
        <Route path="/" element={<FaceExpression type="wink" />} />

        {/* Modes */}
        <Route path="/delivery" element={<DeliveryMode />} />
        <Route path="/direct" element={<DirectDeliveryMode />} />
        <Route path="/cruise" element={<CruiseMode />} />
        <Route path="/guide" element={<GreetGuideMode />} />
        <Route path="/special" element={<SpecialMode />} />
        <Route path="/return" element={<ReturnMode />} />

        {/* Music */}
        <Route path="/music" element={<MusicHome />} />
        <Route path="/music/playlists" element={<PlaylistsPage />} />
        <Route path="/music/playlist/:id" element={<PlaylistEditor />} />
        <Route path="/music/files" element={<ImportMusicPage />} />
        <Route path="/music/import" element={<ImportMusicPage />} />
        <Route path="/music/expression-sounds" element={<ExpressionSoundsPage />} />

        {/* Settings */}
        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="/settings/basic" replace />} />
          <Route path="basic" element={<BasicSettings />} />
          <Route path="communication" element={<CommunicationSettings />} />
          <Route path="wlan" element={<WlanSettings />} />
          <Route path="map" element={<MapSettings />} />
          <Route path="volume" element={<VolumeSettings />} />
          <Route path="voice" element={<VoiceSettings />} />
          <Route path="speed" element={<SpeedSettings />} />
          <Route path="dotmatrix" element={<DotMatrixSettings />} />
          <Route path="tray" element={<TraySettings />} />
          <Route path="update" element={<UpdateSettings />} />
          <Route path="about" element={<AboutSettings />} />
          <Route path="debug" element={<DebugSettings />} />
          <Route path="category" element={<CategorySettings />} />
          <Route path="maps" element={<MapManagement />} />
          <Route path="destinations" element={<DestinationsManagement />} />
        </Route>
      </Routes>

      {/* Global Modals & Overlays */}
      <RobotErrorDisplay />
      <RobotInitDisplay />
      <ModeMenuPopup />
      <ConfirmDialog />
      <PinModal />
      <Toast />
      <DeliveryOverlay />
      <ThankYouOverlay />
    </BrowserRouter>
  );
}

export default App;
