import React, { useEffect, useState } from "react";
import { Slider } from "../../components/Slider";
import { Volume2, Music, MessageSquare } from "lucide-react";
import { clamp } from "../../hooks/useResponsive";
import { useSettingsStore } from "../../store/settingsStore";
import { audioService } from "../../services/AudioService";

export const VolumeSettings = () => {
  const { settings, setSetting } = useSettingsStore();
  const [masterVol, setMasterVol] = useState(80);
  const [musicVol, setMusicVol] = useState(60);
  const [voiceVol, setVoiceVol] = useState(100);

  useEffect(() => {
    setMasterVol(parseInt(settings?.master_volume ?? '80', 10));
    setMusicVol(parseInt(settings?.music_volume ?? '60', 10));
    setVoiceVol(parseInt(settings?.voice_volume ?? '100', 10));
  }, [settings?.master_volume, settings?.music_volume, settings?.voice_volume]);

  const unmuteIfNeeded = async () => {
    if (audioService.isMuted) {
      audioService.isMuted = false;
      window.speechSynthesis.cancel();
    }
  };

  const handleMasterChange = async (val) => {
    setMasterVol(val);
    await setSetting('master_volume', String(val), 'number');
    audioService.setVolume(val / 100);
    if (val > 0) await unmuteIfNeeded();
  };

  const handleMusicChange = async (val) => {
    setMusicVol(val);
    await setSetting('music_volume', String(val), 'number');
    if (val > 0) await unmuteIfNeeded();
  };

  const handleVoiceChange = async (val) => {
    setVoiceVol(val);
    await setSetting('voice_volume', String(val), 'number');
    if (val > 0) await unmuteIfNeeded();
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <h2 className="font-semibold text-gray-800 mb-6"
          style={{ fontSize: clamp(18, 2, 26) }}>
        Volume Settings
      </h2>

      <Slider label="Master Volume" icon={Volume2} min={0} max={100} step={1} value={masterVol} onChange={handleMasterChange} />
      <Slider label="Music Volume" icon={Music} min={0} max={100} step={1} value={musicVol} onChange={handleMusicChange} />
      <Slider label="Voice Volume" icon={MessageSquare} min={0} max={100} step={1} value={voiceVol} onChange={handleVoiceChange} />
    </div>
  );
};
