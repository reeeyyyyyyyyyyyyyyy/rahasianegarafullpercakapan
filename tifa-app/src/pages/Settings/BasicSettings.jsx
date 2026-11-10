import React, { useEffect, useState } from "react";
import { Slider } from "../../components/Slider";
import { clamp } from "../../hooks/useResponsive";
import { useSettingsStore } from "../../store/settingsStore";
import { ScreenBrightness } from "@capacitor-community/screen-brightness";

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
];

export const BasicSettings = () => {
  const { settings, setSetting } = useSettingsStore();
  const currentLang = settings?.language || 'en';
  const [brightness, setBrightness] = useState(60);

  useEffect(() => {
    const loadBrightness = async () => {
      try {
        const { brightness: current } = await ScreenBrightness.getBrightness();
        if (current >= 0) {
          setBrightness(Math.round(current * 100));
        } else {
          const saved = parseInt(settings?.screen_brightness ?? '60', 10);
          setBrightness(saved);
          await ScreenBrightness.setBrightness({ brightness: saved / 100 });
        }
      } catch {
        setBrightness(parseInt(settings?.screen_brightness ?? '60', 10));
      }
    };
    loadBrightness();
  }, []);

  const handleBrightnessChange = async (val) => {
    setBrightness(val);
    await setSetting('screen_brightness', String(val), 'number');
    try {
      await ScreenBrightness.setBrightness({ brightness: val / 100 });
    } catch {}
  };

  const selectLanguage = async (code) => {
    await setSetting('language', code, 'string');
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <h2 className="font-semibold text-gray-800 mb-6"
          style={{ fontSize: clamp(18, 2, 26) }}>
        Basic Settings
      </h2>

      <div className="mb-6">
        <h3 className="font-medium mb-2 text-gray-700"
            style={{ fontSize: clamp(14, 1.5, 18) }}>
          Screen Brightness
        </h3>
        <Slider min={10} max={100} step={1} value={brightness} onChange={handleBrightnessChange} />
      </div>

      <div>
        <h3 className="font-medium mb-2 text-gray-700"
            style={{ fontSize: clamp(14, 1.5, 18) }}>
          Language
        </h3>
        <div className="space-y-2">
          {LANGUAGES.map((lang) => (
            <div
              key={lang.code}
              onClick={() => selectLanguage(lang.code)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                currentLang === lang.code
                  ? 'bg-blue-100 border-2 border-blue-500 text-blue-700 font-medium'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {lang.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
