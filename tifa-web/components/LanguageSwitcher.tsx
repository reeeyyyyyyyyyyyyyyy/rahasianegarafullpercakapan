"use client";

import { useLanguage } from "./LanguageProvider";

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 backdrop-blur-sm">
            <button
                onClick={() => setLanguage("id")}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${language === "id"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-700 dark:text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
            >
                ID
            </button>
            <button
                onClick={() => setLanguage("en")}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${language === "en"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-700 dark:text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
            >
                EN
            </button>
        </div>
    );
}
