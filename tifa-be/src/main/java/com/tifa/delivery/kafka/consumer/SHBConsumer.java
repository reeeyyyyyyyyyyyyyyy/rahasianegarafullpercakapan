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
 * SHB (Set Home Base) Consumer
 * Consumes ui.command.shb topic
 * Stores robot home location in m_goal and t_robot_goal
 */
@Component
public class SHBConsumer {

    private static final Logger logger = LoggerFactory.getLogger(SHBConsumer.class);
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final DeviceResolverService deviceResolver;
    private final MessageDedupeService dedupeService;
    private final WsTrafficLogger wsTrafficLogger;

    public SHBConsumer(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper,
            DeviceResolverService deviceResolver,
            MessageDedupeService dedupeService,
            WsTrafficLogger wsTrafficLogger) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.deviceResolver = deviceResolver;
        this.dedupeService = dedupeService;
        this.wsTrafficLogger = wsTrafficLogger;
    }

    @KafkaListener(topics = "ui.command.shb", groupId = "tifa-backend-group")
    public void consumeSHB(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            Timestamp timestamp = Timestamp.from(Instant.parse(json.get("timestamp").asText()));

            if (dedupeService.isDuplicate(messageId)) {
                logger.debug("[SHBConsumer] Duplicate message_id={}, skipping", messageId);
                ack.acknowledge();
                return;
            }

            JsonNode data = json.get("data");
            String deviceCode = data.get("device_code").asText();
            long mapId = data.get("map_id").asLong();
            double x = data.get("x").asDouble();
            double y = data.get("y").asDouble();
            double yaw = data.get("yaw").asDouble();

            logger.info("[SHBConsumer] Processing SHB for device_code={}, map_id={}, x={}, y={}, yaw={}",
                    deviceCode, mapId, x, y, yaw);

            Integer deviceId = deviceResolver.getOrCreateDeviceId(deviceCode);
            if (deviceId == null) {
                logger.error("[SHBConsumer] Unable to resolve device_id for device_code={}", deviceCode);
                ack.acknowledge();
                return;
            }

            logger.info("[SHBConsumer] Device lookup: device_code={} → device_id={}", deviceCode, deviceId);

            // Insert new HOME goal into m_goal
            Long newGoalId = jdbcTemplate.queryForObject(
                    "INSERT INTO m_goal (map_id, goal_code, goal_name, goal_type, x, y, yaw, created_at) " +
                            "VALUES (?, ?, ?, 'HOME', ?, ?, ?, NOW()) " +
                            "RETURNING goal_id",
                    Long.class,
                    mapId,
                    "HOME_" + deviceCode + "_" + System.currentTimeMillis(),
                    "Home Base for Device " + deviceCode,
                    x, y, yaw);

            logger.info("[SHBConsumer] Created new HOME goal: goal_id={}", newGoalId);

            // Delete existing HOME mapping for this device
            int deleted = jdbcTemplate.update(
                    "DELETE FROM t_robot_goal WHERE device_id = ? AND goal_type = 'HOME'",
                    deviceId);

            if (deleted > 0) {
                logger.info("[SHBConsumer] Deleted old HOME mapping for device_id={}", deviceId);
            }

            // Insert new HOME mapping into t_robot_goal
            jdbcTemplate.update(
                    "INSERT INTO t_robot_goal (device_id, map_id, goal_id, goal_type, created_at, updated_at) " +
                            "VALUES (?, ?, ?, 'HOME', NOW(), NOW())",
                    deviceId, mapId, newGoalId);

            logger.info("[SHBConsumer] ✅ Set home base for device_id={} ({}) to goal_id={}",
                    deviceId, deviceCode, newGoalId);

            // Audit to h_command_log
            jdbcTemplate.update(
                    "INSERT INTO h_command_log (device_id, command_code, command_payload, status, status_message, created_at) "
                            +
                            "VALUES (?, 'SHB', ?::jsonb, 'COMPLETED', ?, ?)",
                    deviceId, message, "Home base set to goal_id=" + newGoalId, timestamp);

            wsTrafficLogger.log(deviceId, "IN", "SHB", message, timestamp);
            dedupeService.markProcessed(messageId);

            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[SHBConsumer] Error processing SHB: {}", e.getMessage(), e);
            ack.acknowledge();
        }
    }
}
