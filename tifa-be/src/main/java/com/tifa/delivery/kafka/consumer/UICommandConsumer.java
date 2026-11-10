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
 * UI Command Consumer
 * Consumes ui.command.* topics
 * Saves to h_command_log
 * Creates queue for OP commands
 */
@Component
public class UICommandConsumer {

    private static final Logger logger = LoggerFactory.getLogger(UICommandConsumer.class);
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final DeviceResolverService deviceResolver;
    private final MessageDedupeService dedupeService;
    private final WsTrafficLogger wsTrafficLogger;

    public UICommandConsumer(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper,
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
     * Consume ui.command.op (Operational command with multiple trays)
     */
    @KafkaListener(topics = "ui.command.op", groupId = "tifa-backend-group")
    public void consumeOP(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            JsonNode data = json.get("data");
            String targetRobotId = data.get("robot_id").asText();
            Timestamp timestamp = Timestamp.from(Instant.parse(json.get("timestamp").asText()));

            if (dedupeService.isDuplicate(messageId)) {
                logger.debug("[UICommandConsumer] Duplicate OP command: {}", messageId);
                ack.acknowledge();
                return;
            }

            Integer deviceId = deviceResolver.getOrCreateDeviceId(targetRobotId);
            if (deviceId == null) {
                logger.error("[UICommandConsumer] Unable to resolve device_id for robot {}", targetRobotId);
                ack.acknowledge();
                return;
            }

            String opStatus = data.has("status") ? data.get("status").asText() : "SENT";
            String opStatusMessage = data.has("status_message") ? data.get("status_message").asText() : null;

            // Log command
            jdbcTemplate.update(
                    "INSERT INTO h_command_log (device_id, command_code, command_payload, status, status_message, created_at) VALUES (?, ?, ?::jsonb, ?, ?, ?)",
                    deviceId, "OP", message, opStatus, opStatusMessage, timestamp);

            wsTrafficLogger.log(deviceId, "IN", "OP", message, timestamp);

            // Create queue
            Long queueId = createQueue(deviceId, data, messageId);

            logger.info("[UICommandConsumer] OP command processed: queue_id={}, robot={}", queueId, targetRobotId);

            dedupeService.markProcessed(messageId);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[UICommandConsumer] Error processing OP: {}", e.getMessage(), e);
            ack.acknowledge();
        }
    }

    /**
     * Create goal queue with details
     */
    private Long createQueue(Integer deviceId, JsonNode data, String messageId) {
        Integer mapId = data.has("map_id") ? data.get("map_id").asInt() : null;
        Integer requestBy = data.has("requested_by") ? data.get("requested_by").asInt() : null;

        Long queueId = jdbcTemplate.queryForObject(
                "INSERT INTO t_goal_queue (device_id, status, created_at, payload, map_id, requested_by, started_at) VALUES (?, 'QUEUED', NOW(), ?::jsonb, ?, ?, NOW()) RETURNING goal_queue_id",
                Long.class,
                deviceId, data.toString(), mapId, requestBy);

        JsonNode trayTasks = data.get("tray_tasks");
        int sequence = 1;

        for (JsonNode tray : trayTasks) {
            int trayNumber = tray.get("tray").asInt();
            Integer goalId = tray.has("goal_id") ? tray.get("goal_id").asInt() : null;
            JsonNode dest = tray.get("dest");
            double x = dest.get("x").asDouble();
            double y = dest.get("y").asDouble();
            double yaw = dest.get("yaw").asDouble();

            jdbcTemplate.update(
                    "INSERT INTO t_goal_queue_detail (goal_queue_id, goal_id, sequence_order, dest_x, dest_y, dest_yaw, status) VALUES (?, ?, ?, ?, ?, ?, ?::goal_queue_status_t)",
                    queueId, goalId, sequence, x, y, yaw, "QUEUED");

            sequence++;
        }

        logger.info("[UICommandConsumer] Created queue {} with {} trays", queueId, trayTasks.size());
        return queueId;
    }

    /**
     * Consume ui.command.move (Simple MOVE command)
     */
    @KafkaListener(topics = "ui.command.move", groupId = "tifa-backend-group")
    public void consumeMove(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            JsonNode data = json.get("data");
            String targetRobotId = data.get("robot_id").asText();
            Timestamp timestamp = Timestamp.from(Instant.parse(json.get("timestamp").asText()));

            if (dedupeService.isDuplicate(messageId)) {
                ack.acknowledge();
                return;
            }

            Integer deviceId = deviceResolver.getOrCreateDeviceId(targetRobotId);
            if (deviceId == null) {
                logger.error("[UICommandConsumer] Unable to resolve device_id for robot {}", targetRobotId);
                ack.acknowledge();
                return;
            }

            String opStatus = data.has("status") ? data.get("status").asText() : "SENT";
            String opStatusMessage = data.has("status_message") ? data.get("status_message").asText() : null;

            jdbcTemplate.update(
                    "INSERT INTO h_command_log (device_id, command_code, command_payload, status, status_message, created_at) VALUES (?, ?, ?::jsonb, ?, ?, ?)",
                    deviceId, "MOVE", message, opStatus, opStatusMessage, timestamp);

            wsTrafficLogger.log(deviceId, "IN", "MOVE", message, timestamp);

            dedupeService.markProcessed(messageId);

            logger.debug("[UICommandConsumer] MOVE command logged: robot={}", targetRobotId);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[UICommandConsumer] Error processing MOVE: {}", e.getMessage());
            ack.acknowledge();
        }
    }

    /**
     * Consume ui.command.mode
     */
    @KafkaListener(topics = "ui.command.mode", groupId = "tifa-backend-group")
    public void consumeMode(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            JsonNode data = json.get("data");
            String targetRobotId = data.get("robot_id").asText();
            Timestamp timestamp = Timestamp.from(Instant.parse(json.get("timestamp").asText()));

            if (dedupeService.isDuplicate(messageId)) {
                ack.acknowledge();
                return;
            }

            Integer deviceId = deviceResolver.getOrCreateDeviceId(targetRobotId);
            if (deviceId == null) {
                logger.error("[UICommandConsumer] Unable to resolve device_id for robot {}", targetRobotId);
                ack.acknowledge();
                return;
            }

            String opStatus = data.has("status") ? data.get("status").asText() : "SENT";
            String opStatusMessage = data.has("status_message") ? data.get("status_message").asText() : null;

            jdbcTemplate.update(
                    "INSERT INTO h_command_log (device_id, command_code, command_payload, status, status_message, created_at) VALUES (?, ?, ?::jsonb, ?, ?, ?)",
                    deviceId, "MODE", message, opStatus, opStatusMessage, timestamp);

            wsTrafficLogger.log(deviceId, "IN", "MODE", message, timestamp);
            dedupeService.markProcessed(messageId);

            logger.debug("[UICommandConsumer] MODE command logged: robot={}", targetRobotId);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[UICommandConsumer] Error processing MODE: {}", e.getMessage());
            ack.acknowledge();
        }
    }
}
