package com.tifa.delivery.kafka.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tifa.delivery.kafka.MessageDedupeService;
import com.tifa.delivery.service.DeviceResolverService;
import com.tifa.delivery.service.WsTrafficLogger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;

/**
 * Robot Expression Consumer
 * Consumes robot.events.expression (LED patterns, sounds, emotions)
 * Saves to h_expression
 */
@Component
public class RobotExpressionConsumer {

    private static final Logger logger = LoggerFactory.getLogger(RobotExpressionConsumer.class);
    private final ObjectMapper objectMapper;
    private final DeviceResolverService deviceResolver;
    private final MessageDedupeService dedupeService;
    private final WsTrafficLogger wsTrafficLogger;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public RobotExpressionConsumer(org.springframework.jdbc.core.JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            DeviceResolverService deviceResolver,
            MessageDedupeService dedupeService,
            WsTrafficLogger wsTrafficLogger) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.deviceResolver = deviceResolver;
        this.dedupeService = dedupeService;
        this.wsTrafficLogger = wsTrafficLogger;
    }

    @KafkaListener(topics = "robot.events.expression", groupId = "tifa-backend-group")
    public void consumeExpression(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            String robotId = json.get("origin_id").asText();
            JsonNode data = json.get("data");
            Timestamp timestamp = Timestamp.from(Instant.parse(json.get("timestamp").asText()));

            String expressionType = data.has("expression_type") ? data.get("expression_type").asText() : null;
            String expressionMessage = data.has("message") ? data.get("message").asText() : null;

            Integer deviceId = deviceResolver.getOrCreateDeviceId(robotId);
            if (deviceId == null) {
                logger.warn("[RobotExpressionConsumer] Device not found: {}", robotId);
                ack.acknowledge();
                return;
            }

            if (dedupeService.isDuplicate(messageId)) {
                logger.debug("[RobotExpressionConsumer] Duplicate expression: {}", messageId);
                ack.acknowledge();
                return;
            }

            jdbcTemplate.update(
                    "INSERT INTO h_expression (device_id, expression_type, message, recorded_at, payload) VALUES (?, ?, ?, ?, ?::jsonb)",
                    deviceId, expressionType, expressionMessage, timestamp, message);

            wsTrafficLogger.log(deviceId, "IN", "EXPRESSION", message, timestamp);
            dedupeService.markProcessed(messageId);

            logger.debug("[RobotExpressionConsumer] Expression logged: {} from {}", expressionType, robotId);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[RobotExpressionConsumer] Error processing expression: {}", e.getMessage());
            ack.acknowledge();
        }
    }
}
