package com.tifa.delivery.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Shared Device Resolver Service
 * Consolidates the duplicated getOrCreateDeviceId() logic
 * that was previously copy-pasted across 6+ Kafka consumers.
 */
@Service
public class DeviceResolverService {

    private static final Logger logger = LoggerFactory.getLogger(DeviceResolverService.class);
    private final JdbcTemplate jdbcTemplate;

    public DeviceResolverService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Resolve device_id by device_code, creating a minimal m_device row if missing.
     * Returns null if still unresolved.
     *
     * @param deviceCode the device code (e.g., robot_id or ui_id)
     * @return device_id or null
     */
    public Integer getOrCreateDeviceId(String deviceCode) {
        if (deviceCode == null || deviceCode.isBlank()) {
            logger.warn("[DeviceResolver] Null or blank device code");
            return null;
        }

        try {
            return jdbcTemplate.queryForObject(
                    "SELECT device_id FROM m_device WHERE device_code = ?",
                    Integer.class,
                    deviceCode);
        } catch (EmptyResultDataAccessException e) {
            try {
                Integer newId = jdbcTemplate.queryForObject(
                        "INSERT INTO m_device (device_code, device_name) VALUES (?, ?) " +
                                "ON CONFLICT (device_code) DO UPDATE SET device_name = EXCLUDED.device_name " +
                                "RETURNING device_id",
                        Integer.class,
                        deviceCode, deviceCode);
                logger.info("[DeviceResolver] Auto-registered device {} with device_id {}", deviceCode, newId);
                return newId;
            } catch (Exception ex) {
                logger.error("[DeviceResolver] Failed to auto-create device {}: {}", deviceCode, ex.getMessage());
                return null;
            }
        } catch (Exception e) {
            logger.error("[DeviceResolver] Failed to resolve device {}: {}", deviceCode, e.getMessage());
            return null;
        }
    }

    /**
     * Convenience: resolve and return as Long (for consumers that use Long
     * device_id).
     */
    public Long getOrCreateDeviceIdAsLong(String deviceCode) {
        Integer id = getOrCreateDeviceId(deviceCode);
        return id != null ? id.longValue() : null;
    }
}
