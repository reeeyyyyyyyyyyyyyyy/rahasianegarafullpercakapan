package com.tifa.delivery.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;

/**
 * Shared WS Traffic Logger Service
 * Consolidates the duplicated h_ws_traffic INSERT logic
 * that was previously inlined across 7+ Kafka consumers.
 */
@Service
public class WsTrafficLogger {

    private static final Logger logger = LoggerFactory.getLogger(WsTrafficLogger.class);
    private final JdbcTemplate jdbcTemplate;

    public WsTrafficLogger(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Log a WS traffic entry to h_ws_traffic.
     *
     * @param deviceId   resolved device ID
     * @param direction  "IN" or "OUT"
     * @param code       message code (e.g., "OP", "MOVE", "POSITION")
     * @param payload    full JSON payload
     * @param recordedAt timestamp of the event
     */
    public void log(Integer deviceId, String direction, String code, String payload, Timestamp recordedAt) {
        try {
            jdbcTemplate.update(
                    "INSERT INTO h_ws_traffic (device_id, direction, code, payload, recorded_at) VALUES (?, ?, ?, ?::jsonb, ?)",
                    deviceId, direction, code, payload, recordedAt);
        } catch (Exception e) {
            logger.warn("[WsTrafficLogger] Failed to log h_ws_traffic (code={}): {}", code, e.getMessage());
        }
    }

    /**
     * Log with remote address (used by ConnectionLogConsumer).
     */
    public void log(Integer deviceId, String direction, String code, String payload, String remoteAddr,
            Timestamp recordedAt) {
        try {
            jdbcTemplate.update(
                    "INSERT INTO h_ws_traffic (device_id, direction, code, payload, remote_addr, recorded_at) " +
                            "VALUES (?, ?, ?, ?::jsonb, ?::inet, ?)",
                    deviceId, direction, code, payload, remoteAddr, recordedAt);
        } catch (Exception e) {
            logger.warn("[WsTrafficLogger] Failed to log h_ws_traffic (code={}, addr={}): {}", code, remoteAddr,
                    e.getMessage());
        }
    }

    /**
     * Log with NOW() timestamp (convenience for cases where timestamp is not
     * parsed).
     */
    public void logNow(Integer deviceId, String direction, String code, String payload) {
        try {
            jdbcTemplate.update(
                    "INSERT INTO h_ws_traffic (device_id, direction, code, payload, recorded_at) VALUES (?, ?, ?, ?::jsonb, NOW())",
                    deviceId, direction, code, payload);
        } catch (Exception e) {
            logger.warn("[WsTrafficLogger] Failed to log h_ws_traffic (code={}): {}", code, e.getMessage());
        }
    }
}
