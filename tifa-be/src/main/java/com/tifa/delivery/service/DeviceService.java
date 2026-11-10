package com.tifa.delivery.service;

import com.tifa.delivery.entity.Device;
import com.tifa.delivery.entity.DeviceNetwork;
import com.tifa.delivery.repository.DeviceNetworkRepository;
import com.tifa.delivery.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Device Service for v3
 * Provides device network info for fallback routing
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final DeviceNetworkRepository deviceNetworkRepository;

    /**
     * Get device network info for fallback routing
     * GET /api/devices/{deviceId}/network-info
     */
    public Map<String, Object> getNetworkInfo(String deviceCode) {
        log.info("Getting network info for device: {}", deviceCode);

        Device device = deviceRepository.findByDeviceCode(deviceCode)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceCode));

        DeviceNetwork network = deviceNetworkRepository.findFirstByDeviceIdOrderByLastSeenDesc(device.getDeviceId())
                .orElse(null);

        Map<String, Object> result = new HashMap<>();
        result.put("deviceId", device.getDeviceId());
        result.put("deviceCode", device.getDeviceCode());
        result.put("deviceName", device.getDeviceName());

        if (network != null) {
            result.put("ipAddress", network.getIpAddress());
            result.put("ssid", network.getSsid());
            result.put("macAddress", network.getMacAddress());
            // NOTE: accessInfo (password) should be encrypted in production
            result.put("accessInfo", network.getAccessInfo());
        } else {
            // Fallback to robot_local_ip from m_device
            result.put("ipAddress", device.getRobotLocalIp());
            result.put("ssid", device.getRobotLocalSsid());
        }

        return result;
    }
}
