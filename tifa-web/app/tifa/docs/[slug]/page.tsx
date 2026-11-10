'use client';

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { DOC_SECTIONS } from "../layout";

/* ------------------------------------------------------------------ */
/*  Content definitions — placeholder stubs for every section          */
/* ------------------------------------------------------------------ */

interface HeadingEntry { id: string; text: string; level: number }

interface SectionContent {
    title: string;
    description: string;
    headings: HeadingEntry[];
    body: React.ReactNode;
}

function ComingSoon({ title }: { title: string }) {
    return (
        <div className="docs-coming-soon">
            <div className="docs-coming-soon-icon">
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            </div>
            <h3>Content Coming Soon</h3>
            <p>The <strong>{title}</strong> documentation is being prepared. Check back soon for detailed guides, code examples, and reference material.</p>
        </div>
    );
}

function buildSectionContent(slug: string): SectionContent {
    const map: Record<string, SectionContent> = {
        overview: {
            title: "Overview",
            description: "Introduction to TIFA — Tel-U Interactive Food Assistant robot platform.",
            headings: [
                { id: "what-is-tifa", text: "What is TIFA?", level: 2 },
                { id: "key-capabilities", text: "Key Capabilities", level: 2 },
                { id: "system-architecture", text: "System Architecture", level: 2 },
                { id: "supported-platforms", text: "Supported Platforms", level: 2 },
            ],
            body: (
                <>
                    <section id="what-is-tifa">
                        <h2>What is TIFA?</h2>
                        <p className="docs-lead">
                            <strong>TIFA (Tel-U Interactive Food Assistant)</strong> is a modular autonomous logistics robot designed for restaurant and hospitality environments. Built by the Diagonal Robotic Solution team at Telkom University, TIFA combines autonomous navigation, voice interaction, and IoT sensing to deliver a seamless food-delivery experience.
                        </p>
                        <div className="docs-info-box">
                            <div className="docs-info-box-icon">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <strong>Note:</strong> This documentation covers TIFA hardware revision 2.x and software stack v1.0+. For older revisions, please contact the development team.
                            </div>
                        </div>
                    </section>

                    <section id="key-capabilities">
                        <h2>Key Capabilities</h2>
                        <ComingSoon title="Key Capabilities" />
                    </section>

                    <section id="system-architecture">
                        <h2>System Architecture</h2>
                        <ComingSoon title="System Architecture" />
                    </section>

                    <section id="supported-platforms">
                        <h2>Supported Platforms</h2>
                        <div className="docs-table-wrapper">
                            <table className="docs-table">
                                <thead>
                                    <tr>
                                        <th>Feature</th>
                                        <th>ROS 2 Humble</th>
                                        <th>ROS 2 Jazzy</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td>Teleoperation</td><td>✓</td><td>✓</td></tr>
                                    <tr><td>SLAM</td><td>✓</td><td>✓</td></tr>
                                    <tr><td>Navigation</td><td>✓</td><td>✓</td></tr>
                                    <tr><td>Voice Interaction</td><td>✓</td><td>?</td></tr>
                                    <tr><td>IoT Sensor</td><td>✓</td><td>✓</td></tr>
                                    <tr><td>Dashboard</td><td>✓</td><td>✓</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="docs-caption">✓ Available &nbsp; ? Unverified &nbsp; ✗ Unavailable</p>
                    </section>
                </>
            ),
        },

        features: {
            title: "Features",
            description: "Detailed breakdown of TIFA's modular feature set.",
            headings: [
                { id: "autonomous-navigation", text: "Autonomous Navigation", level: 2 },
                { id: "multi-tray-payload", text: "Multi-Tray Payload", level: 2 },
                { id: "voice-assistant", text: "Voice Assistant", level: 2 },
                { id: "real-time-dashboard", text: "Real-Time Dashboard", level: 2 },
                { id: "iot-integration", text: "IoT Integration", level: 2 },
            ],
            body: (
                <>
                    <section id="autonomous-navigation"><h2>Autonomous Navigation</h2><ComingSoon title="Autonomous Navigation" /></section>
                    <section id="multi-tray-payload"><h2>Multi-Tray Payload</h2><ComingSoon title="Multi-Tray Payload" /></section>
                    <section id="voice-assistant"><h2>Voice Assistant</h2><ComingSoon title="Voice Assistant" /></section>
                    <section id="real-time-dashboard"><h2>Real-Time Dashboard</h2><ComingSoon title="Real-Time Dashboard" /></section>
                    <section id="iot-integration"><h2>IoT Integration</h2><ComingSoon title="IoT Integration" /></section>
                </>
            ),
        },

        "quick-start": {
            title: "Quick Start Guide",
            description: "Get TIFA up and running in minutes.",
            headings: [
                { id: "prerequisites", text: "Prerequisites", level: 2 },
                { id: "power-on", text: "Power On", level: 2 },
                { id: "network-setup", text: "Network Setup", level: 2 },
                { id: "first-run", text: "First Run", level: 2 },
            ],
            body: (
                <>
                    <section id="prerequisites"><h2>Prerequisites</h2><ComingSoon title="Prerequisites" /></section>
                    <section id="power-on"><h2>Power On</h2><ComingSoon title="Power On" /></section>
                    <section id="network-setup"><h2>Network Setup</h2><ComingSoon title="Network Setup" /></section>
                    <section id="first-run"><h2>First Run</h2><ComingSoon title="First Run" /></section>
                </>
            ),
        },

        "hardware-setup": {
            title: "Hardware Setup",
            description: "Assembly, wiring, and mechanical configuration.",
            headings: [
                { id: "chassis-assembly", text: "Chassis Assembly", level: 2 },
                { id: "motor-wiring", text: "Motor & Driver Wiring", level: 2 },
                { id: "sensor-mounting", text: "Sensor Mounting", level: 2 },
                { id: "battery-setup", text: "Battery Setup", level: 2 },
            ],
            body: (
                <>
                    <section id="chassis-assembly"><h2>Chassis Assembly</h2><ComingSoon title="Chassis Assembly" /></section>
                    <section id="motor-wiring"><h2>Motor &amp; Driver Wiring</h2><ComingSoon title="Motor & Driver Wiring" /></section>
                    <section id="sensor-mounting"><h2>Sensor Mounting</h2><ComingSoon title="Sensor Mounting" /></section>
                    <section id="battery-setup"><h2>Battery Setup</h2><ComingSoon title="Battery Setup" /></section>
                </>
            ),
        },

        "software-setup": {
            title: "Software Setup",
            description: "OS installation, ROS 2 workspace, and dependency configuration.",
            headings: [
                { id: "os-installation", text: "OS Installation", level: 2 },
                { id: "ros2-workspace", text: "ROS 2 Workspace", level: 2 },
                { id: "dependencies", text: "Dependencies", level: 2 },
                { id: "build-launch", text: "Build & Launch", level: 2 },
            ],
            body: (
                <>
                    <section id="os-installation"><h2>OS Installation</h2><ComingSoon title="OS Installation" /></section>
                    <section id="ros2-workspace"><h2>ROS 2 Workspace</h2><ComingSoon title="ROS 2 Workspace" /></section>
                    <section id="dependencies"><h2>Dependencies</h2><ComingSoon title="Dependencies" /></section>
                    <section id="build-launch"><h2>Build &amp; Launch</h2><ComingSoon title="Build & Launch" /></section>
                </>
            ),
        },

        "slam-navigation": {
            title: "SLAM & Navigation",
            description: "Mapping, localization, and autonomous path planning.",
            headings: [
                { id: "slam-overview", text: "SLAM Overview", level: 2 },
                { id: "create-map", text: "Creating a Map", level: 2 },
                { id: "navigation-stack", text: "Navigation Stack", level: 2 },
                { id: "waypoint-navigation", text: "Waypoint Navigation", level: 2 },
            ],
            body: (
                <>
                    <section id="slam-overview"><h2>SLAM Overview</h2><ComingSoon title="SLAM Overview" /></section>
                    <section id="create-map"><h2>Creating a Map</h2><ComingSoon title="Creating a Map" /></section>
                    <section id="navigation-stack"><h2>Navigation Stack</h2><ComingSoon title="Navigation Stack" /></section>
                    <section id="waypoint-navigation"><h2>Waypoint Navigation</h2><ComingSoon title="Waypoint Navigation" /></section>
                </>
            ),
        },

        teleoperation: {
            title: "Teleoperation",
            description: "Remote-control TIFA from the web dashboard or a gamepad.",
            headings: [
                { id: "web-teleop", text: "Web Dashboard Teleop", level: 2 },
                { id: "keyboard-control", text: "Keyboard Control", level: 2 },
                { id: "gamepad", text: "Gamepad Support", level: 2 },
            ],
            body: (
                <>
                    <section id="web-teleop"><h2>Web Dashboard Teleop</h2><ComingSoon title="Web Dashboard Teleop" /></section>
                    <section id="keyboard-control"><h2>Keyboard Control</h2><ComingSoon title="Keyboard Control" /></section>
                    <section id="gamepad"><h2>Gamepad Support</h2><ComingSoon title="Gamepad Support" /></section>
                </>
            ),
        },

        "voice-interaction": {
            title: "Voice Interaction",
            description: "Speech-to-text, text-to-speech, and conversational AI pipeline.",
            headings: [
                { id: "stt-engine", text: "STT Engine", level: 2 },
                { id: "tts-engine", text: "TTS Engine", level: 2 },
                { id: "conversation-flow", text: "Conversation Flow", level: 2 },
            ],
            body: (
                <>
                    <section id="stt-engine"><h2>STT Engine</h2><ComingSoon title="STT Engine" /></section>
                    <section id="tts-engine"><h2>TTS Engine</h2><ComingSoon title="TTS Engine" /></section>
                    <section id="conversation-flow"><h2>Conversation Flow</h2><ComingSoon title="Conversation Flow" /></section>
                </>
            ),
        },

        "iot-sensor": {
            title: "IoT Sensor (ESP32)",
            description: "Seeed Studio XIAO ESP32C3 sensor integration for environmental monitoring.",
            headings: [
                { id: "esp32-overview", text: "ESP32C3 Overview", level: 2 },
                { id: "sensor-wiring", text: "Sensor Wiring", level: 2 },
                { id: "firmware-flash", text: "Firmware Flashing", level: 2 },
                { id: "data-pipeline", text: "Data Pipeline", level: 2 },
            ],
            body: (
                <>
                    <section id="esp32-overview"><h2>ESP32C3 Overview</h2><ComingSoon title="ESP32C3 Overview" /></section>
                    <section id="sensor-wiring"><h2>Sensor Wiring</h2><ComingSoon title="Sensor Wiring" /></section>
                    <section id="firmware-flash"><h2>Firmware Flashing</h2><ComingSoon title="Firmware Flashing" /></section>
                    <section id="data-pipeline"><h2>Data Pipeline</h2><ComingSoon title="Data Pipeline" /></section>
                </>
            ),
        },

        "dashboard-monitoring": {
            title: "Dashboard & Monitoring",
            description: "Web dashboard setup, live telemetry, and robot management.",
            headings: [
                { id: "dashboard-overview", text: "Dashboard Overview", level: 2 },
                { id: "live-telemetry", text: "Live Telemetry", level: 2 },
                { id: "robot-management", text: "Robot Management", level: 2 },
                { id: "notification-system", text: "Notification System", level: 2 },
            ],
            body: (
                <>
                    <section id="dashboard-overview"><h2>Dashboard Overview</h2><ComingSoon title="Dashboard Overview" /></section>
                    <section id="live-telemetry"><h2>Live Telemetry</h2><ComingSoon title="Live Telemetry" /></section>
                    <section id="robot-management"><h2>Robot Management</h2><ComingSoon title="Robot Management" /></section>
                    <section id="notification-system"><h2>Notification System</h2><ComingSoon title="Notification System" /></section>
                </>
            ),
        },

        "api-reference": {
            title: "API Reference",
            description: "WebSocket commands, REST endpoints, and payload schemas.",
            headings: [
                { id: "websocket-api", text: "WebSocket API", level: 2 },
                { id: "rest-endpoints", text: "REST Endpoints", level: 2 },
                { id: "payload-schemas", text: "Payload Schemas", level: 2 },
            ],
            body: (
                <>
                    <section id="websocket-api"><h2>WebSocket API</h2><ComingSoon title="WebSocket API" /></section>
                    <section id="rest-endpoints"><h2>REST Endpoints</h2><ComingSoon title="REST Endpoints" /></section>
                    <section id="payload-schemas"><h2>Payload Schemas</h2><ComingSoon title="Payload Schemas" /></section>
                </>
            ),
        },

        troubleshooting: {
            title: "Troubleshooting",
            description: "Common issues and their solutions.",
            headings: [
                { id: "connection-issues", text: "Connection Issues", level: 2 },
                { id: "navigation-problems", text: "Navigation Problems", level: 2 },
                { id: "hardware-debugging", text: "Hardware Debugging", level: 2 },
            ],
            body: (
                <>
                    <section id="connection-issues"><h2>Connection Issues</h2><ComingSoon title="Connection Issues" /></section>
                    <section id="navigation-problems"><h2>Navigation Problems</h2><ComingSoon title="Navigation Problems" /></section>
                    <section id="hardware-debugging"><h2>Hardware Debugging</h2><ComingSoon title="Hardware Debugging" /></section>
                </>
            ),
        },

        faq: {
            title: "FAQ",
            description: "Frequently asked questions about TIFA.",
            headings: [
                { id: "general-questions", text: "General Questions", level: 2 },
                { id: "technical-questions", text: "Technical Questions", level: 2 },
                { id: "purchasing", text: "Purchasing & Support", level: 2 },
            ],
            body: (
                <>
                    <section id="general-questions"><h2>General Questions</h2><ComingSoon title="General Questions" /></section>
                    <section id="technical-questions"><h2>Technical Questions</h2><ComingSoon title="Technical Questions" /></section>
                    <section id="purchasing"><h2>Purchasing &amp; Support</h2><ComingSoon title="Purchasing & Support" /></section>
                </>
            ),
        },
    };

    return map[slug] ?? {
        title: "Not Found",
        description: "This documentation page does not exist.",
        headings: [],
        body: (
            <div className="docs-not-found">
                <h2>Page Not Found</h2>
                <p>The documentation page you are looking for does not exist.</p>
                <Link href="/tifa/docs/overview" className="docs-btn-primary">Go to Overview</Link>
            </div>
        ),
    };
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function DocsSlugPage() {
    const params = useParams();
    const slug = (params?.slug as string) ?? "overview";
    const content = buildSectionContent(slug);
    const contentRef = useRef<HTMLDivElement>(null);

    // Track active TOC heading
    const [activeTocId, setActiveTocId] = useState<string>("");

    useEffect(() => {
        if (content.headings.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveTocId(entry.target.id);
                        break;
                    }
                }
            },
            { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
        );

        const sections = content.headings
            .map(h => document.getElementById(h.id))
            .filter(Boolean) as HTMLElement[];

        sections.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, [content.headings]);

    // Prev / Next navigation
    const currentIndex = DOC_SECTIONS.findIndex(s => s.id === slug);
    const prev = currentIndex > 0 ? DOC_SECTIONS[currentIndex - 1] : null;
    const next = currentIndex < DOC_SECTIONS.length - 1 ? DOC_SECTIONS[currentIndex + 1] : null;

    return (
        <div className="docs-page-wrapper">
            {/* Center content */}
            <article className="docs-content" ref={contentRef}>
                {/* Page header */}
                <div className="docs-content-header">
                    <h1>{content.title}</h1>
                    <p className="docs-content-description">{content.description}</p>
                </div>

                {/* Content body */}
                <div className="docs-content-body">
                    {content.body}
                </div>

                {/* Prev / Next */}
                <div className="docs-prev-next">
                    {prev ? (
                        <Link href={prev.href} className="docs-prev-next-link docs-prev-link">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            <div>
                                <span className="docs-prev-next-label">Previous</span>
                                <span className="docs-prev-next-title">{prev.title}</span>
                            </div>
                        </Link>
                    ) : <div />}
                    {next ? (
                        <Link href={next.href} className="docs-prev-next-link docs-next-link">
                            <div>
                                <span className="docs-prev-next-label">Next</span>
                                <span className="docs-prev-next-title">{next.title}</span>
                            </div>
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                    ) : <div />}
                </div>
            </article>

            {/* Right sidebar — TOC */}
            {content.headings.length > 0 && (
                <aside className="docs-toc">
                    <div className="docs-toc-inner">
                        <h4 className="docs-toc-title">On This Page</h4>
                        <nav className="docs-toc-nav">
                            {content.headings.map(h => (
                                <a
                                    key={h.id}
                                    href={`#${h.id}`}
                                    className={`docs-toc-link ${activeTocId === h.id ? "docs-toc-link--active" : ""}`}
                                    style={{ paddingLeft: h.level === 3 ? 24 : 0 }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }}
                                >
                                    {h.text}
                                </a>
                            ))}
                        </nav>
                    </div>
                </aside>
            )}
        </div>
    );
}
