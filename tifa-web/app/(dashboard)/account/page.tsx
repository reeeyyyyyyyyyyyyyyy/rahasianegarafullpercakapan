"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, updateUserProfile } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { useRouter } from "next/navigation";

type UserProfile = {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    lastSignIn: string;
};

export default function AccountPage() {
    const { dict } = useLanguage();
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            const { data: user } = await getCurrentUser();

            if (!user) {
                router.push("/login");
                return;
            }

            setProfile({
                id: user.id,
                email: user.email || "",
                role: user.role || "operator",
                createdAt: "", // Not available in our User type, can be expanded later
                lastSignIn: "",
            });
            setLoading(false);
        };

        void loadProfile();
    }, [router]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: "error", text: dict.dashboard.account?.password_mismatch || "Password tidak cocok" });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: "error", text: dict.dashboard.account?.password_too_short || "Password minimal 6 karakter" });
            return;
        }

        setUpdating(true);

        const { error } = await updateUserProfile({ password: newPassword });

        if (error) {
            setMessage({ type: "error", text: error });
        } else {
            setMessage({ type: "success", text: dict.dashboard.account?.password_updated || "Password berhasil diperbarui" });
            setNewPassword("");
            setConfirmPassword("");
        }

        setUpdating(false);
    };

    const getRoleDisplayName = () => {
        if (profile?.role === "admin") {
            return dict.auth.roles.admin || "Administrator";
        }
        return dict.auth.roles.operator || "Operator";
    };

    const getRoleColor = () => {
        if (profile?.role === "admin") {
            return "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/20";
        }
        return "bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/20";
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4 text-txt-sec">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin" />
                    <span className="text-xs uppercase tracking-widest">{dict.common.loading}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-txt-main tracking-tight">
                    {dict.dashboard.account?.title || "Kelola Akun"}
                </h1>
                <p className="text-sm text-txt-sec">
                    {dict.dashboard.account?.subtitle || "Lihat dan kelola informasi akun Anda"}
                </p>
            </div>

            {/* Profile Card */}
            <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-blue-900/20 flex-shrink-0">
                        {profile?.email.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-4">
                        <div>
                            <p className="text-xl font-semibold text-txt-main">{profile?.email}</p>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full text-xs font-medium border ${getRoleColor()}`}>
                                {profile?.role === "admin" ? (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                                    </svg>
                                )}
                                {getRoleDisplayName()}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border-base">
                            <div>
                                <p className="text-xs text-txt-sec mb-1">
                                    {dict.dashboard.account?.created_at || "Akun dibuat"}
                                </p>
                                <p className="text-sm text-txt-main font-mono bg-sidebar px-3 py-2 rounded-lg border border-border-base">
                                    {formatDate(profile?.createdAt || "")}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-txt-sec mb-1">
                                    {dict.dashboard.account?.last_login || "Login terakhir"}
                                </p>
                                <p className="text-sm text-txt-main font-mono bg-sidebar px-3 py-2 rounded-lg border border-border-base">
                                    {formatDate(profile?.lastSignIn || "")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-txt-main mb-4">
                    {dict.dashboard.account?.change_password || "Ubah Password"}
                </h2>

                {message && (
                    <div
                        className={`p-4 rounded-lg mb-4 text-sm flex items-center gap-2 ${message.type === "success"
                            ? "bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-100 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
                            }`}
                    >
                        {message.type === "success" ? (
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-txt-sec uppercase tracking-wider block mb-2">
                                {dict.dashboard.account?.new_password || "Password Baru"}
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="input-dark w-full px-4 py-3 rounded-xl text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-txt-sec uppercase tracking-wider block mb-2">
                                {dict.dashboard.account?.confirm_new_password || "Konfirmasi Password"}
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-dark w-full px-4 py-3 rounded-xl text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={updating || !newPassword || !confirmPassword}
                        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {updating ? (
                            <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>{dict.common.loading}</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                <span>{dict.dashboard.account?.update_password || "Update Password"}</span>
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Account ID - For debugging/support */}
            <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-txt-main mb-4">
                    {dict.dashboard.account?.account_id || "ID Akun"}
                </h2>
                <div className="flex items-center gap-3">
                    <code className="flex-1 px-4 py-3 rounded-xl bg-sidebar border border-border-base text-xs font-mono text-txt-sec overflow-x-auto">
                        {profile?.id}
                    </code>
                    <button
                        type="button"
                        onClick={() => {
                            navigator.clipboard.writeText(profile?.id || "");
                            setMessage({ type: "success", text: "ID copied!" });
                            setTimeout(() => setMessage(null), 2000);
                        }}
                        className="p-3 rounded-xl bg-card-bg border border-border-base text-txt-sec hover:text-txt-main hover:border-border-highlight transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
