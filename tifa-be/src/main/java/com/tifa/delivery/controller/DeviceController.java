package com.tifa.delivery.controller;

import com.tifa.delivery.service.DeviceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Device Controller for v3
 * Provides device network info for fallback routing
 */
@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
@Slf4j
public class DeviceController {

    private final DeviceService deviceService;

    /**
     * GET /api/devices/{deviceId}/network-info
     * Get robot network info for fallback routing to hotspot WS
     * Called by WS Cloud Router when robot offline
     */
    @GetMapping("/{deviceId}/network-info")
    public ResponseEntity<Map<String, Object>> getNetworkInfo(@PathVariable String deviceId) {
        log.info("Network info requested for device: {}", deviceId);

        try {
            Map<String, Object> networkInfo = deviceService.getNetworkInfo(deviceId);
            return ResponseEntity.ok(networkInfo);
        } catch (Exception e) {
            log.error("Failed to get network info: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }
}
