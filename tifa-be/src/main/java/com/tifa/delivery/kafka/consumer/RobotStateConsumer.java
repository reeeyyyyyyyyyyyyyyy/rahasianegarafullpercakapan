package com.tifa.delivery.kafka.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tifa.delivery.kafka.MessageDedupeService;
import com.tifa.delivery.service.DeviceResolverService;
import com.tifa.delivery.service.WsTrafficLogger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;

/**
 * Robot State Consumer
 * Consumes robot telemetry: position, battery, status
 * Saves to h_position, h_battery, h_state
 */
@Component
public class RobotStateConsumer {

    private static final Logger logger = LoggerFactory.getLogger(RobotStateConsumer.class);
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final DeviceResolverService deviceResolver;
    private final MessageDedupeService dedupeService;
    private final WsTrafficLogger wsTrafficLogger;

    public RobotStateConsumer(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper,
            DeviceResolverService deviceResolver,
            MessageDedupeService dedupeService,
            WsTrafficLogger wsTrafficLogger) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.deviceResolver = deviceResolver;
        this.dedupeService = dedupeService;
        this.wsTrafficLogger = wsTrafficLogger;
    }

    /**
     * Consume robot.state.position
     */
    @KafkaListener(topics = "robot.state.position", groupId = "tifa-backend-group")
    public void consumePosition(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            String robotId = json.get("origin_id").asText();
            JsonNode data = json.get("data");

            double x = data.get("x").asDouble();
            double y = data.get("y").asDouble();
            double yaw = data.get("yaw").asDouble();
            Timestamp timestamp = Timestamp.from(Instant.parse(json.get("timestamp").asText()));

            Integer deviceId = deviceResolver.getOrCreateDeviceId(robotId);
            if (deviceId == null) {
                logger.warn("[RobotStateConsumer] Device not found: {}", robotId);
                ack.acknowledge();
                return;
            }

            if (dedupeService.isDuplicate(messageId)) {
                logger.debug("[RobotStateConsumer] Duplicate message: {}", messageId);
                ack.acknowledge();
                return;
            }

            jdbcTemplate.update(
                    "INSERT INTO h_position (device_id, x, y, yaw, recorded_at, raw_payload) VALUES (?, ?, ?, ?, ?, ?::jsonb)",
                    deviceId, x, y, yaw, timestamp, message);

            wsTrafficLogger.log(deviceId, "IN", "POSITION", message, timestamp);
            dedupeService.markProcessed(messageId);

            logger.debug("[RobotStateConsumer] Position saved: {} at ({}, {})", robotId, x, y);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[RobotStateConsumer] Error processing position: {}", e.getMessage());
            ack.acknowledge();
        }
    }

    /**
     * Consume robot.state.battery
     */
    @KafkaListener(topics = "robot.state.battery", groupId = "tifa-backend-group")
    public void consumeBattery(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            String robotId = json.get("origin_id").asText();
            JsonNode data = json.get("data");

            double batteryPercent = data.has("battery_level") ? data.get("battery_level").asDouble()
                    : (data.has("battery_percent") ? data.get("battery_percent").asDouble() : 0.0);
            Double voltage = data.has("voltage") && !data.get("voltage").isNull() ? data.get("voltage").asDouble()
                    : null;
            Timestamp timestamp = Timestamp.from(Instant.parse(json.get("timestamp").asText()));

            Integer deviceId = deviceResolver.getOrCreateDeviceId(robotId);
            if (deviceId == null) {
                logger.warn("[RobotStateConsumer] Device not found: {}", robotId);
                ack.acknowledge();
                return;
            }

            if (dedupeService.isDuplicate(messageId)) {
                ack.acknowledge();
                return;
            }

            jdbcTemplate.update(
                    "INSERT INTO h_battery (device_id, battery_percent, voltage, recorded_at, raw_payload) VALUES (?, ?, ?, ?, ?::jsonb)",
                    deviceId, batteryPercent, voltage, timestamp, message);

            wsTrafficLogger.log(deviceId, "IN", "BATTERY", message, timestamp);
            dedupeService.markProcessed(messageId);

            logger.debug("[RobotStateConsumer] Battery saved: {} at {}% ({}V)", robotId, batteryPercent, voltage);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[RobotStateConsumer] Error processing battery: {}", e.getMessage());
            ack.acknowledge();
        }
    }

    /**
     * Consume robot.state.status
     */
    @KafkaListener(topics = "robot.state.status", groupId = "tifa-backend-group")
    public void consumeStatus(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            String robotId = json.get("origin_id").asText();
            JsonNode data = json.get("data");

            String mode = data.has("mode") ? data.get("mode").asText() : null;
            String status = data.get("status").asText();
            Timestamp timestamp = Timestamp.from(Instant.parse(json.get("timestamp").asText()));

            Integer deviceId = deviceResolver.getOrCreateDeviceId(robotId);
            if (deviceId == null) {
                logger.warn("[RobotStateConsumer] Device not found: {}", robotId);
                ack.acknowledge();
                return;
            }

            if (dedupeService.isDuplicate(messageId)) {
                ack.acknowledge();
                return;
            }

            jdbcTemplate.update(
                    "INSERT INTO h_state (device_id, robot_mode, robot_activity, recorded_at, raw_payload) VALUES (?, ?::robot_mode_t, ?, ?, ?::jsonb)",
                    deviceId, mode, status, timestamp, message);

            wsTrafficLogger.log(deviceId, "IN", "STATUS", message, timestamp);
            dedupeService.markProcessed(messageId);

            logger.debug("[RobotStateConsumer] Status saved: {} = {}", robotId, status);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[RobotStateConsumer] Error processing status: {}", e.getMessage());
            ack.acknowledge();
        }
    }
}
