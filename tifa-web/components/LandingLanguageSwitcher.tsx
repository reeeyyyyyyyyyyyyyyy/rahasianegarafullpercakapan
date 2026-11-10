"use client";

import { useLanguage } from "./LanguageProvider";

interface LandingLanguageSwitcherProps {
    theme?: 'diagonal' | 'tifa';
    isScrolled?: boolean;
}

export default function LandingLanguageSwitcher({ theme = 'diagonal', isScrolled = false }: LandingLanguageSwitcherProps) {
    const { language, setLanguage } = useLanguage();

    const isTifa = theme === 'tifa';

    // Dynamic button styles based on theme and scroll state
    const getButtonStyle = (isActive: boolean) => {
        if (isActive) {
            return isTifa
                ? "bg-[#B6252A] text-white shadow-sm"
                : "bg-[#1A1A1A] text-white shadow-sm";
        }
        if (isScrolled && !isTifa) {
            return "text-[#1A1A1A] hover:bg-gray-100";
        }
        return "text-white/70 hover:text-white hover:bg-white/10";
    };

    const containerStyle = isScrolled && !isTifa
        ? "bg-gray-100 border-gray-200"
        : "bg-white/10 border-white/20";

    return (
        <div className={`flex items-center gap-1 p-1 rounded-lg border backdrop-blur-sm ${containerStyle}`}>
            <button
                onClick={() => setLanguage("id")}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${getButtonStyle(language === "id")}`}
            >
                ID
            </button>
            <button
                onClick={() => setLanguage("en")}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${getButtonStyle(language === "en")}`}
            >
                EN
            </button>
        </div>
    );
}
