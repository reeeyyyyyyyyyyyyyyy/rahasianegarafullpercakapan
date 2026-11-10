"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Default to dark mode as that's the current "base" theme
    const [theme, setThemeState] = useState<Theme>("dark");
    const [mounted, setMounted] = useState(false);

    // Initial theme load - runs once
    useEffect(() => {
        const savedTheme = localStorage.getItem("tifa_theme") as Theme;
        if (savedTheme) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setThemeState(savedTheme);
        } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
            setThemeState("light");
        }
        setMounted(true);
    }, []);

    // Apply theme to DOM
    useEffect(() => {
        if (!mounted) return;

        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        localStorage.setItem("tifa_theme", theme);
    }, [theme, mounted]);

    // Memoized callbacks to prevent re-renders
    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);

    // Memoized context value
    const value = useMemo(() => ({
        theme,
        setTheme,
        toggleTheme
    }), [theme, setTheme, toggleTheme]);

    // Prevent flash of unstyled content
    if (!mounted) {
        return null;
    }

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
