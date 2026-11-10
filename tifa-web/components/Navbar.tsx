"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const { dict } = useLanguage();
    const rafRef = useRef<number>(0);
    const lastScrollY = useRef(0);

    // Throttled scroll handler for better performance
    const handleScroll = useCallback(() => {
        // Cancel any pending animation frame
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        rafRef.current = requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;
            // Only update state if scroll position crosses threshold
            if ((currentScrollY > 50) !== (lastScrollY.current > 50)) {
                setIsScrolled(currentScrollY > 50);
            }
            lastScrollY.current = currentScrollY;
        });
    }, []);

    useEffect(() => {
        // Passive listener for better scroll performance
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [handleScroll]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 gpu-accelerated ${isScrolled
                ? "bg-page/80 backdrop-blur-sm shadow-lg py-4 border-b border-white/10"
                : "bg-transparent py-6"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" onClick={() => scrollToSection('home')} className="flex items-center gap-3 group">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#608FFF] to-[#325FEB] flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-[#325FEB]/20 border border-[#608FFF]/20 group-hover:scale-105 transition-transform">
                        T
                    </div>
                    <span className="text-xl font-bold tracking-tight text-txt-main">TIFA</span>
                </Link>

                {/* Floating Menu (Center) - visible on desktop */}
                <div className="hidden md:flex items-center gap-1 bg-white/5 backdrop-blur-sm px-2 py-1.5 rounded-full border border-white/10 shadow-xl">
                    {[
                        { id: 'home', label: dict.landing.nav.home },
                        { id: 'produk', label: dict.landing.nav.product },
                        { id: 'layanan', label: dict.landing.nav.service },
                        { id: 'kontak', label: dict.landing.nav.contact },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            className="px-5 py-2 text-sm font-medium text-txt-sec hover:text-white hover:bg-white/10 rounded-full transition-all"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-4">
                    <ThemeSwitcher />
                    <LanguageSwitcher />

                    <Link
                        href="/login"
                        className="hidden sm:block px-5 py-2.5 text-sm font-semibold text-white bg-[#325FEB] rounded-lg hover:bg-[#608FFF] transition-all shadow-lg shadow-[#325FEB]/30 ring-1 ring-white/10 hover-lift"
                    >
                        {dict.landing.nav.get_started}
                    </Link>
                </div>
            </div>
        </nav>
    );
}
