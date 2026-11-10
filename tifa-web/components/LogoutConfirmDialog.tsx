"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "./LanguageProvider";

interface LogoutConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading?: boolean;
}

export default function LogoutConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    loading = false,
}: LogoutConfirmDialogProps) {
    const { dict } = useLanguage();
    const dialogRef = useRef<HTMLDivElement>(null);

    // Handle ESC key to close dialog
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when dialog is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

            {/* Dialog */}
            <div
                ref={dialogRef}
                className="relative w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/20 flex items-center justify-center">
                        <svg
                            className="w-8 h-8 text-rose-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-txt-main text-center mb-2">
                    {dict.dashboard.logout_confirm?.title || "Konfirmasi Logout"}
                </h3>

                {/* Message */}
                <p className="text-txt-sec text-center text-sm mb-6">
                    {dict.dashboard.logout_confirm?.message ||
                        "Apakah Anda yakin ingin keluar dari akun Anda?"}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-3 rounded-xl border border-border-base bg-card-bg text-txt-sec font-medium text-sm hover:bg-sidebar hover:text-txt-main transition-colors disabled:opacity-50"
                    >
                        {dict.dashboard.logout_confirm?.cancel || "Batal"}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg
                                    className="animate-spin h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                <span>Logging out...</span>
                            </>
                        ) : (
                            dict.dashboard.logout_confirm?.confirm || "Ya, Logout"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
