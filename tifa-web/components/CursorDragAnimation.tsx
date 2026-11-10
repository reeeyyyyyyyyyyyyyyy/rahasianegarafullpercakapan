"use client";

import { useEffect, useState } from 'react';

/**
 * Cursor Drag Animation — Figma/design-tool style selection effect
 * 
 * Phases:
 * 1. Cursor enters from bottom-right, moves to start position
 * 2. Selection box draws out from cursor origin (dashed border)
 * 3. Handles appear at corners + midpoints, text glows
 * 4. Hold, then everything fades out and loops
 * 
 * Entirely CSS-animated for GPU performance. pointer-events: none so
 * buttons beneath remain clickable.
 */
export default function CursorDragAnimation() {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        // Delay start so the hero ".reveal" animation finishes first
        const timer = setTimeout(() => setIsActive(true), 1200);
        return () => clearTimeout(timer);
    }, []);

    if (!isActive) return null;

    return (
        <div className="cursor-drag-overlay" aria-hidden="true">
            {/* Selection box — expands from top-left to fill the text area */}
            <div className="cursor-drag-selection">
                {/* Corner handles */}
                <span className="cdh cdh-tl" />
                <span className="cdh cdh-tr" />
                <span className="cdh cdh-bl" />
                <span className="cdh cdh-br" />
                {/* Midpoint handles */}
                <span className="cdh cdh-tm" />
                <span className="cdh cdh-bm" />
                <span className="cdh cdh-ml" />
                <span className="cdh cdh-mr" />
            </div>

            {/* Cursor pointer — moves along a path */}
            <div className="cursor-drag-cursor">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M5 3L5 17L9.5 12.5L14 19L16 18L11.5 11L17 11L5 3Z"
                        fill="white"
                        stroke="rgba(0,0,0,0.4)"
                        strokeWidth="1"
                        strokeLinejoin="round"
                    />
                </svg>
                {/* Drag plus icon */}
                <span className="cursor-drag-badge">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 2V8M2 5H8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </span>
            </div>
        </div>
    );
}
