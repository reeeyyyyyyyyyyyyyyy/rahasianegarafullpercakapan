"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

export default function InteractiveCursor() {
    const followerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    // Position refs to avoid state updates on every frame
    const posRef = useRef({ x: 0, y: 0 });
    const mouseRef = useRef({ x: 0, y: 0 });
    const rafRef = useRef<number>(0);

    // Throttled mouse move handler
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isVisible) setIsVisible(true);
        mouseRef.current.x = e.clientX;
        mouseRef.current.y = e.clientY;
    }, [isVisible]);

    useEffect(() => {
        const follower = followerRef.current;
        if (!follower) return;

        // Follower speed
        const speed = 0.12;
        let lastTime = 0;
        const throttleMs = 16; // ~60fps throttle

        const animate = (currentTime: number) => {
            // Throttle animation frame
            if (currentTime - lastTime >= throttleMs) {
                lastTime = currentTime;

                // Linear interpolation for smooth movement
                posRef.current.x += (mouseRef.current.x - posRef.current.x) * speed;
                posRef.current.y += (mouseRef.current.y - posRef.current.y) * speed;

                // Center the glow (reduced from 400px to 300px for performance)
                follower.style.transform = `translate3d(${posRef.current.x - 150}px, ${posRef.current.y - 150}px, 0)`;
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        const handleMouseLeave = () => setIsVisible(false);
        const handleMouseEnter = () => setIsVisible(true);

        // Passive listeners for better scroll performance
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('mouseenter', handleMouseEnter);

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('mouseenter', handleMouseEnter);
            cancelAnimationFrame(rafRef.current);
        };
    }, [isVisible, handleMouseMove]);

    if (!isVisible) return null;

    return (
        /* Soft Shadow / Glow Effect - Optimized */
        <div
            ref={followerRef}
            className="fixed top-0 left-0 w-[300px] h-[300px] rounded-full pointer-events-none z-0 mix-blend-screen opacity-35"
            style={{
                background: 'radial-gradient(circle, rgba(146, 248, 255, 0.2) 0%, rgba(10, 54, 247, 0.04) 40%, transparent 70%)',
                filter: 'blur(25px)',
                willChange: 'transform',
                contain: 'layout paint',
            }}
        />
    );
}
