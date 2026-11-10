// Robot Grouping Utility
// Groups RB and UI_TIFA_ devices that share the same numeric ID
// Example: TFUI1 + TFRB1 = grouped robot "TIFA-001"

import type { Robot, DeviceStatus } from '@/lib/types/database';

// Extract numeric ID from device code
// TFUI1 -> "001", TFRB1 -> "001", TFUI12 -> "0012"
export function extractRobotId(deviceCode: string): string | null {
    // Match RB followed by digits
    const rbMatch = deviceCode.match(/^RB(\d+)$/i);
    if (rbMatch) return rbMatch[1];

    // Match UI_TIFA_ followed by digits
    const uiMatch = deviceCode.match(/^UI_TIFA_(\d+)$/i);
    if (uiMatch) return uiMatch[1];

    // Match TFUI followed by digits (Tablet UI app = apps_id)
    const tfuiMatch = deviceCode.match(/^TFUI(\d+)$/i);
    if (tfuiMatch) return tfuiMatch[1];

    // Match TFRB followed by digits (Robot hardware = robot_id)
    const tfrbMatch = deviceCode.match(/^TFRB(\d+)$/i);
    if (tfrbMatch) return tfrbMatch[1];

    return null;
}

// Normalize robot ID to consistent format (pad to 3 digits minimum)
export function normalizeRobotId(id: string): string {
    const num = parseInt(id, 10);
    return num.toString().padStart(3, '0');
}

// Get device type from device code
export type DeviceType = 'RB' | 'UI_TIFA' | 'OTHER';

export function getDeviceType(deviceCode: string): DeviceType {
    const code = deviceCode.toUpperCase();
    if (code.startsWith('RB') || code.startsWith('TFRB')) return 'RB';
    if (code.startsWith('UI_TIFA_') || code.startsWith('TFUI')) return 'UI_TIFA';
    return 'OTHER';
}

// Grouped robot type for display
export type GroupedRobot = {
    groupId: string;           // Normalized ID e.g., "001"
    displayName: string;       // e.g., "TIFA-001"
    rbDevice: Robot | null;    // Physical robot component
    uiDevice: Robot | null;    // UI system component
    devices: Robot[];          // All devices in this group
    primaryDeviceId: number;   // device_id to use for navigation
    createdAt: string;         // Earliest created_at from devices
};

// Grouped robot with status
export type GroupedRobotWithStatus = GroupedRobot & {
    isOnline: boolean;         // true if any component is online
    battery: number | null;    // from RB device preferably (SoC)
    batteryLevel: number | null; // from RB device preferably (SoH)
    mode: string | null;       // current robot mode
    localIp: string | null;    // IP from any available device
    localSsid: string | null;  // SSID from any available device
};

// Group robots by their numeric ID
export function groupRobots(robots: Robot[]): GroupedRobot[] {
    const groups = new Map<string, { rb: Robot | null; ui: Robot | null; others: Robot[] }>();

    for (const robot of robots) {
        const robotId = extractRobotId(robot.device_code);

        if (robotId === null) {
            // Non-matching devices stay as individual "groups"
            const uniqueKey = `other_${robot.device_id}`;
            groups.set(uniqueKey, { rb: null, ui: null, others: [robot] });
            continue;
        }

        const normalizedId = normalizeRobotId(robotId);

        if (!groups.has(normalizedId)) {
            groups.set(normalizedId, { rb: null, ui: null, others: [] });
        }

        const group = groups.get(normalizedId)!;
        const deviceType = getDeviceType(robot.device_code);

        if (deviceType === 'RB') {
            group.rb = robot;
        } else if (deviceType === 'UI_TIFA') {
            group.ui = robot;
        } else {
            group.others.push(robot);
        }
    }

    // Convert to GroupedRobot array
    const result: GroupedRobot[] = [];

    for (const [key, group] of groups) {
        const devices: Robot[] = [];
        if (group.rb) devices.push(group.rb);
        if (group.ui) devices.push(group.ui);
        devices.push(...group.others);

        if (devices.length === 0) continue;

        const isOtherOnly = key.startsWith('other_');
        const groupId = isOtherOnly ? devices[0].device_code : key;

        // Use RB device name if available, otherwise UI device name
        const primaryDevice = group.rb || group.ui || devices[0];
        const displayName = isOtherOnly
            ? (devices[0].device_name || devices[0].device_code)
            : `TIFA-${groupId}`;

        // Get earliest created_at
        const createdAt = devices.reduce((earliest, d) => {
            return d.created_at < earliest ? d.created_at : earliest;
        }, devices[0].created_at);

        result.push({
            groupId,
            displayName,
            rbDevice: group.rb,
            uiDevice: group.ui,
            devices,
            primaryDeviceId: primaryDevice.device_id,
            createdAt,
        });
    }

    // Sort by groupId
    return result.sort((a, b) => a.groupId.localeCompare(b.groupId, undefined, { numeric: true }));
}

// Add status information to grouped robots
export function addStatusToGroupedRobots(
    groupedRobots: GroupedRobot[],
    deviceStatuses: Map<number, DeviceStatus>,
    onlineThresholdMs: number = 10 * 60 * 1000 // 10 minutes — accounts for WS traffic-based detection
): GroupedRobotWithStatus[] {
    const now = Date.now();

    return groupedRobots.map(group => {
        let isOnline = false;
        let battery: number | null = null;
        let batteryLevel: number | null = null;
        let mode: string | null = null;
        let localIp: string | null = null;
        let localSsid: string | null = null;

        // Check all devices in the group
        for (const device of group.devices) {
            const status = deviceStatuses.get(device.device_id);

            // Check online status
            if (status?.status_updated_at) {
                const updatedAt = new Date(status.status_updated_at).getTime();
                if (now - updatedAt < onlineThresholdMs) {
                    isOnline = true;
                }
            }

            // Get battery (prefer RB device)
            if (status?.battery_percent !== null && status?.battery_percent !== undefined) {
                if (battery === null || getDeviceType(device.device_code) === 'RB') {
                    battery = status.battery_percent;
                    batteryLevel = status.battery_level ?? null;
                }
            }

            // Get mode
            if (status?.robot_mode && !mode) {
                mode = status.robot_mode;
            }

            // Get network info
            if (device.robot_local_ip && !localIp) {
                localIp = device.robot_local_ip;
            }
            if (device.robot_local_ssid && !localSsid) {
                localSsid = device.robot_local_ssid;
            }
        }

        return {
            ...group,
            isOnline,
            battery,
            batteryLevel,
            mode,
            localIp,
            localSsid,
        };
    });
}

// Get device IDs from a grouped robot (for API calls)
export function getDeviceIdsFromGroup(group: GroupedRobot): number[] {
    return group.devices.map(d => d.device_id);
}
