import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ScreenLayout } from "../../components/ScreenLayout";
import { vw, vh, clamp } from "../../hooks/useResponsive";
import { db } from "../../database/indexedDB";
import { audioService } from "../../services/AudioService";

// Built-in sound options
const BUILTIN_SOUNDS = [
  { value: 'arrival', label: '🔔 Arrival (Chime Melody)' },
  { value: 'chime', label: '✨ Chime (Single)' },
  { value: 'success', label: '🎉 Success (Fanfare)' },
  { value: 'warning', label: '⚠️ Warning (Beeps)' },
  { value: 'alert', label: '🚨 Alert (Urgent)' },
  { value: 'pickup', label: '📦 Pickup (Quick Beep)' },
];

// Expression emoji mapping for nice display
const EXPRESSION_EMOJI = {
  neutral: '😐', happy: '😊', sad: '😢', angry: '😠', surprised: '😲',
  wink: '😉', tired: '😫', sleepy: '😴', smile: '🙂', laugh: '😆',
  confused: '😕', relieved: '😌', energized: '⚡', sparkle: '✨', dizzy: '😵',
  broken: '💔', sceptic: '🤨', crazy: '🤪', love: '😍', denying: '🙅',
};

export const ExpressionSoundsPage = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // expression_type being saved
  const [playingPreview, setPlayingPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);

  // Load all expression sound configs
  useEffect(() => {
    loadConfigs();

    // Cleanup: stop all sounds when leaving the page
    return () => {
      audioService.stopAllSounds();
    };
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const all = await db.expression_sounds.toArray();
      // Sort by expression_type
      all.sort((a, b) => a.expression_type.localeCompare(b.expression_type));
      setConfigs(all);
    } catch (error) {
      console.error('Failed to load expression sound configs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle enabled
  const toggleEnabled = async (expressionType) => {
    try {
      setSaving(expressionType);
      const config = await db.expression_sounds.get(expressionType);
      if (config) {
        await db.expression_sounds.update(expressionType, { enabled: !config.enabled });
        await loadConfigs();
      }
    } catch (error) {
      console.error('Failed to toggle:', error);
    } finally {
      setSaving(null);
    }
  };

  // Change built-in sound
  const changeBuiltinSound = async (expressionType, builtinSound) => {
    try {
      setSaving(expressionType);
      await db.expression_sounds.update(expressionType, {
        sound_type: 'builtin',
        builtin_sound: builtinSound,
        file_path: null,
        file_name: null,
        file_blob: null,
      });
      await loadConfigs();
    } catch (error) {
      console.error('Failed to change sound:', error);
    } finally {
      setSaving(null);
    }
  };

  // Handle file upload
  const handleFileSelect = (expressionType) => {
    setUploadTarget(expressionType);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    // Validate file type
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/x-wav'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|ogg|webm)$/i)) {
      alert('Please select a valid audio file (WAV, MP3, OGG, WebM)');
      return;
    }

    try {
      setSaving(uploadTarget);
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      await db.expression_sounds.update(uploadTarget, {
        sound_type: 'file',
        builtin_sound: null,
        file_name: file.name,
        file_blob: blob,
      });
      await loadConfigs();
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload audio file');
    } finally {
      setSaving(null);
      setUploadTarget(null);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Reset to default
  const resetToDefault = async (expressionType) => {
    try {
      setSaving(expressionType);
      // Find the default from the constants
      const defaultMap = {
        neutral: 'chime', happy: 'success', sad: 'warning', angry: 'alert',
        surprised: 'arrival', wink: 'chime', tired: 'chime', sleepy: 'chime',
        smile: 'success', laugh: 'success', confused: 'warning', relieved: 'chime',
        energized: 'success', sparkle: 'arrival', dizzy: 'warning', broken: 'alert',
        sceptic: 'warning', crazy: 'alert', love: 'arrival', denying: 'warning',
      };
      await db.expression_sounds.update(expressionType, {
        sound_type: 'builtin',
        builtin_sound: defaultMap[expressionType] || 'chime',
        file_path: null,
        file_name: null,
        file_blob: null,
        enabled: true,
      });
      await loadConfigs();
    } catch (error) {
      console.error('Failed to reset:', error);
    } finally {
      setSaving(null);
    }
  };

  // Preview sound (play/stop toggle)
  const previewSound = async (expressionType) => {
    // If this expression is currently playing, stop it
    if (playingPreview === expressionType) {
      audioService.stopAllSounds();
      setPlayingPreview(null);
      return;
    }

    // Stop any previous preview
    audioService.stopAllSounds();

    try {
      setPlayingPreview(expressionType);
      await audioService.playExpressionSound(expressionType);
      // Auto clear after sound finishes (reasonable max time)
      setTimeout(() => setPlayingPreview((prev) => prev === expressionType ? null : prev), 3000);
    } catch (error) {
      console.error('Failed to preview:', error);
      setPlayingPreview(null);
    }
  };

  // Stop current preview
  const stopPreview = () => {
    audioService.stopAllSounds();
    setPlayingPreview(null);
  };

  return (
    <ScreenLayout>
      <div className="flex-1 flex flex-col bg-bg">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.ogg,.webm"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Title Bar */}
        <div
          className="bg-card-bg border-b border-card-border w-full"
          style={{ padding: `${vh(2)} ${vw(3)}` }}
        >
          <h2
            className="font-bold text-text-primary"
            style={{ fontSize: clamp(20, 2.2, 28) }}
          >
            Expression Sounds
          </h2>
          <p
            className="text-text-secondary mt-1"
            style={{ fontSize: clamp(13, 1.3, 17) }}
          >
            Configure default sound for each face expression
          </p>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: `${vh(2)} ${vw(2)}` }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12 text-text-secondary">
              Loading...
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: vh(1.2) }}>
              {configs.map((config, idx) => (
                <motion.div
                  key={config.expression_type}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`bg-card-bg border rounded-xl transition-all ${
                    config.enabled ? 'border-card-border' : 'border-card-border/50 opacity-60'
                  }`}
                  style={{ padding: `${vh(1.5)} ${vw(2)}` }}
                >
                  <div className="flex items-center gap-3">
                    {/* Expression Icon & Name */}
                    <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: vw(12) }}>
                      <span style={{ fontSize: clamp(22, 2.5, 32) }}>
                        {EXPRESSION_EMOJI[config.expression_type] || '🤖'}
                      </span>
                      <span
                        className="font-semibold text-text-primary capitalize"
                        style={{ fontSize: clamp(14, 1.4, 18) }}
                      >
                        {config.expression_type}
                      </span>
                    </div>

                    {/* Sound Type Display */}
                    <div className="flex-1 flex items-center gap-2">
                      {config.sound_type === 'file' ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium"
                            style={{ fontSize: clamp(11, 1.1, 14) }}
                          >
                            📁 {config.file_name || 'Custom File'}
                          </span>
                        </div>
                      ) : (
                        <select
                          value={config.builtin_sound || 'chime'}
                          onChange={(e) => changeBuiltinSound(config.expression_type, e.target.value)}
                          disabled={!config.enabled || saving === config.expression_type}
                          className="bg-bg border border-card-border rounded-lg text-text-primary outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                          style={{
                            padding: `${vh(0.5)} ${vw(1)}`,
                            fontSize: clamp(12, 1.2, 15),
                            minWidth: vw(16),
                          }}
                        >
                          {BUILTIN_SOUNDS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Play / Stop toggle */}
                      {playingPreview === config.expression_type ? (
                        <button
                          onClick={stopPreview}
                          className="bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          style={{
                            padding: `${vh(0.6)} ${vw(1)}`,
                            fontSize: clamp(12, 1.2, 15),
                          }}
                          title="Stop sound"
                        >
                          ⏹
                        </button>
                      ) : (
                        <button
                          onClick={() => previewSound(config.expression_type)}
                          disabled={!config.enabled}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors disabled:opacity-40"
                          style={{
                            padding: `${vh(0.6)} ${vw(1)}`,
                            fontSize: clamp(12, 1.2, 15),
                          }}
                          title="Preview sound"
                        >
                          ▶
                        </button>
                      )}

                      {/* Choose File */}
                      <button
                        onClick={() => handleFileSelect(config.expression_type)}
                        disabled={!config.enabled || saving === config.expression_type}
                        className="bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors disabled:opacity-40"
                        style={{
                          padding: `${vh(0.6)} ${vw(1)}`,
                          fontSize: clamp(12, 1.2, 15),
                        }}
                        title="Upload audio file"
                      >
                        📂
                      </button>

                      {/* Reset */}
                      <button
                        onClick={() => resetToDefault(config.expression_type)}
                        disabled={saving === config.expression_type}
                        className="bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors disabled:opacity-40"
                        style={{
                          padding: `${vh(0.6)} ${vw(1)}`,
                          fontSize: clamp(12, 1.2, 15),
                        }}
                        title="Reset to default"
                      >
                        ↺
                      </button>

                      {/* Toggle Enable */}
                      <button
                        onClick={() => toggleEnabled(config.expression_type)}
                        disabled={saving === config.expression_type}
                        className={`relative inline-flex items-center rounded-full transition-colors ${
                          config.enabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        style={{
                          width: vw(4.5),
                          height: vh(2.8),
                          minWidth: '44px',
                          minHeight: '24px',
                        }}
                        title={config.enabled ? 'Disable' : 'Enable'}
                      >
                        <motion.div
                          animate={{ x: config.enabled ? '105%' : '10%' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="bg-white rounded-full shadow"
                          style={{
                            width: vh(2.2),
                            height: vh(2.2),
                            minWidth: '18px',
                            minHeight: '18px',
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScreenLayout>
  );
};
