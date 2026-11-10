'use client';

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * /tifa/docs  →  redirect to /tifa/docs/overview
 */
export default function DocsIndexPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/tifa/docs/overview");
    }, [router]);

    return (
        <div className="docs-loading">
            <div className="docs-loading-spinner" />
            <p>Loading documentation…</p>
        </div>
    );
}
