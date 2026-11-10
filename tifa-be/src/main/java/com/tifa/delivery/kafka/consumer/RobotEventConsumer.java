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
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Robot Event Consumer
 * Handles robot.events.goal_complete
 * Implements NEXT TRAY DISPATCH LOGIC
 */
@Component
public class RobotEventConsumer {

    private static final Logger logger = LoggerFactory.getLogger(RobotEventConsumer.class);
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final DeviceResolverService deviceResolver;
    private final MessageDedupeService dedupeService;
    private final WsTrafficLogger wsTrafficLogger;

    public RobotEventConsumer(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper,
            KafkaTemplate<String, String> kafkaTemplate,
            DeviceResolverService deviceResolver,
            MessageDedupeService dedupeService,
            WsTrafficLogger wsTrafficLogger) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.kafkaTemplate = kafkaTemplate;
        this.deviceResolver = deviceResolver;
        this.dedupeService = dedupeService;
        this.wsTrafficLogger = wsTrafficLogger;
    }

    /**
     * Consume robot.events.goal_complete
     * This is the MAIN TRIGGER for NEXT TRAY DISPATCH
     */
    @KafkaListener(topics = "robot.events.goal_complete", groupId = "tifa-backend-group")
    public void consumeGoalComplete(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            String robotId = json.get("origin_id").asText();
            JsonNode data = json.get("data");

            Long queueId = data.has("queue_id") ? data.get("queue_id").asLong() : null;
            Integer completedSequence = data.has("sequence") ? data.get("sequence").asInt() : null;

            logger.info("[RobotEventConsumer] 🏁 GOAL_COMPLETE from {}: queue={}, seq={}",
                    robotId, queueId, completedSequence);

            if (dedupeService.isDuplicate(messageId)) {
                logger.debug("[RobotEventConsumer] Duplicate goal_complete: {}", messageId);
                ack.acknowledge();
                return;
            }

            // Resolve queueId if not provided by robot
            if (queueId == null && completedSequence != null) {
                Integer deviceId = deviceResolver.getOrCreateDeviceId(robotId);
                if (deviceId != null) {
                    try {
                        Map<String, Object> row = jdbcTemplate.queryForMap(
                                "SELECT d.goal_queue_id, d.goal_queue_detail_id " +
                                        "FROM t_goal_queue q " +
                                        "JOIN t_goal_queue_detail d ON d.goal_queue_id = q.goal_queue_id " +
                                        "WHERE q.device_id = ? AND d.sequence_order = ? " +
                                        "AND d.status IN ('IN_PROGRESS','QUEUED') " +
                                        "ORDER BY q.created_at DESC LIMIT 1",
                                deviceId, completedSequence);
                        if (row != null && row.get("goal_queue_id") != null) {
                            queueId = ((Number) row.get("goal_queue_id")).longValue();
                            logger.info("[RobotEventConsumer] Resolved queue_id {} for robot {} seq {}", queueId,
                                    robotId, completedSequence);
                        }
                    } catch (Exception ex) {
                        logger.warn("[RobotEventConsumer] Could not resolve queue for robot {} seq {}: {}", robotId,
                                completedSequence, ex.getMessage());
                    }
                }
            }

            if (completedSequence != null && queueId != null) {
                // [1] Mark current detail as DONE
                int updated = jdbcTemplate.update(
                        "UPDATE t_goal_queue_detail SET status = 'DONE', finished_at = NOW() WHERE goal_queue_id = ? AND sequence_order = ?",
                        queueId, completedSequence);

                if (updated > 0) {
                    logger.info("[RobotEventConsumer] ✅ Marked detail DONE: queue={}, seq={}", queueId,
                            completedSequence);

                    // Log to h_ws_traffic
                    Integer deviceId = deviceResolver.getOrCreateDeviceId(robotId);
                    if (deviceId != null) {
                        wsTrafficLogger.logNow(deviceId, "IN", "GOAL_COMPLETE", message);
                    }
                }

                // [2] Find NEXT tray in queue
                Map<String, Object> nextDetail = findNextDetail(queueId);

                if (nextDetail != null) {
                    // [3] Next tray found → Dispatch it
                    // dispatchNextTray(robotId, queueId, nextDetail);
                } else {
                    // [4] No more trays → Queue DONE
                    markQueueCompleted(queueId, robotId);
                }
            }

            dedupeService.markProcessed(messageId);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[RobotEventConsumer] ❌ Error processing goal_complete: {}", e.getMessage(), e);
            ack.acknowledge();
        }
    }

    /**
     * Find next QUEUED detail in sequence
     */
    private Map<String, Object> findNextDetail(Long queueId) {
        try {
            return jdbcTemplate.queryForMap(
                    "SELECT goal_queue_detail_id, sequence_order, dest_x, dest_y, dest_yaw " +
                            "FROM t_goal_queue_detail " +
                            "WHERE goal_queue_id = ? AND status = 'QUEUED' " +
                            "ORDER BY sequence_order ASC LIMIT 1",
                    queueId);
        } catch (Exception e) {
            logger.debug("[RobotEventConsumer] No next detail found for queue {}", queueId);
            return null;
        }
    }

    /**
     * Dispatch next tray to robot via Kafka
     * Backend → Kafka → WS Gateway → Robot
     */
    private void dispatchNextTray(String robotId, Long queueId, Map<String, Object> detail) {
        try {
            Integer sequence = (Integer) detail.get("sequence_order");
            Double goalX = ((Number) detail.get("dest_x")).doubleValue();
            Double goalY = ((Number) detail.get("dest_y")).doubleValue();
            Double goalYaw = ((Number) detail.get("dest_yaw")).doubleValue();

            logger.info("[RobotEventConsumer] 🚀 Dispatching NEXT TRAY: robot={}, seq={} (queue {})",
                    robotId, sequence, queueId);

            // Mark detail as DISPATCHED
            jdbcTemplate.update(
                    "UPDATE t_goal_queue_detail SET status = 'IN_PROGRESS', started_at = NOW() WHERE goal_queue_detail_id = ?",
                    detail.get("goal_queue_detail_id"));

            // Ensure queue status reflects progress
            jdbcTemplate.update(
                    "UPDATE t_goal_queue SET status = 'IN_PROGRESS' WHERE goal_queue_id = ? AND status <> 'DONE'",
                    queueId);

            // Prepare message for WS Gateway
            Map<String, Object> msg = new HashMap<>();
            msg.put("robot_id", robotId);
            msg.put("sequence", sequence);

            Map<String, Object> dest = new HashMap<>();
            dest.put("x", goalX);
            dest.put("y", goalY);
            dest.put("yaw", goalYaw);
            msg.put("dest", dest);

            msg.put("message_id", UUID.randomUUID().toString());
            msg.put("timestamp", java.time.Instant.now().toString());

            // Publish to Kafka → WS Gateway will consume and forward to robot
            String jsonStr = objectMapper.writeValueAsString(msg);
            kafkaTemplate.send("be.command.dispatch_next_tray", robotId, jsonStr);

            logger.info("[RobotEventConsumer] ✅ Published dispatch_next_tray to Kafka");

        } catch (Exception e) {
            logger.error("[RobotEventConsumer] ❌ Failed to dispatch next tray: {}", e.getMessage(), e);
        }
    }

    /**
     * Mark queue as completed
     */
    private void markQueueCompleted(Long queueId, String robotId) {
        try {
            logger.info("[RobotEventConsumer] 🏁 Queue {} COMPLETED (no more trays)", queueId);

            // Update queue status
            jdbcTemplate.update(
                    "UPDATE t_goal_queue SET status = 'DONE', finished_at = NOW() WHERE goal_queue_id = ?",
                    queueId);

            // Publish queue completed event
            Map<String, Object> msg = new HashMap<>();
            msg.put("robot_id", robotId);
            msg.put("message_id", UUID.randomUUID().toString());
            msg.put("timestamp", java.time.Instant.now().toString());

            String jsonStr = objectMapper.writeValueAsString(msg);
            kafkaTemplate.send("be.queue.completed", robotId, jsonStr);

            logger.info("[RobotEventConsumer] ✅ Published queue.completed to Kafka");

        } catch (Exception e) {
            logger.error("[RobotEventConsumer] ❌ Failed to mark queue completed: {}", e.getMessage(), e);
        }
    }

    /**
     * Consume other robot events (mapping complete, stuck, emergency stop)
     */
    @KafkaListener(topics = { "robot.events.mapping_complete", "robot.events.robot_stuck",
            "robot.events.emergency_stop" }, groupId = "tifa-backend-group")
    public void consumeOtherEvents(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            String robotId = json.get("origin_id").asText();
            String eventType = json.get("code").asText();

            logger.info("[RobotEventConsumer] 📢 Event from {}: {}", robotId, eventType);

            if (dedupeService.isDuplicate(messageId)) {
                ack.acknowledge();
                return;
            }

            // Log to h_ws_traffic
            Integer deviceId = deviceResolver.getOrCreateDeviceId(robotId);
            if (deviceId != null) {
                wsTrafficLogger.logNow(deviceId, "IN", eventType, message);
            }

            logger.info("[RobotEventConsumer] Event logged: {}", eventType);

            dedupeService.markProcessed(messageId);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[RobotEventConsumer] Error processing event: {}", e.getMessage());
            ack.acknowledge();
        }
    }
}
