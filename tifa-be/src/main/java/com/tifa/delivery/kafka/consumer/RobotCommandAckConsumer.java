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
 * Robot Command ACK Consumer
 * Consumes acknowledgments from robots and audits them to h_ws_traffic
 */
@Component
public class RobotCommandAckConsumer {

    private static final Logger logger = LoggerFactory.getLogger(RobotCommandAckConsumer.class);
    private final ObjectMapper objectMapper;
    private final DeviceResolverService deviceResolver;
    private final MessageDedupeService dedupeService;
    private final WsTrafficLogger wsTrafficLogger;

    public RobotCommandAckConsumer(ObjectMapper objectMapper,
            DeviceResolverService deviceResolver,
            MessageDedupeService dedupeService,
            WsTrafficLogger wsTrafficLogger) {
        this.objectMapper = objectMapper;
        this.deviceResolver = deviceResolver;
        this.dedupeService = dedupeService;
        this.wsTrafficLogger = wsTrafficLogger;
    }

    @KafkaListener(topics = "robot.command.ack", groupId = "tifa-backend-group")
    public void consumeAck(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.has("message_id") ? json.get("message_id").asText() : null;
            String robotId = json.has("origin_id") ? json.get("origin_id").asText() : null;
            Timestamp timestamp = json.has("timestamp") ? Timestamp.from(Instant.parse(json.get("timestamp").asText()))
                    : Timestamp.from(Instant.now());

            if (robotId == null) {
                logger.warn("[RobotCommandAckConsumer] Missing origin_id in message: {}", message);
                ack.acknowledge();
                return;
            }

            Integer deviceId = deviceResolver.getOrCreateDeviceId(robotId);
            if (deviceId == null) {
                logger.warn("[RobotCommandAckConsumer] Device not found: {}", robotId);
                ack.acknowledge();
                return;
            }

            if (messageId != null && dedupeService.isDuplicate(messageId)) {
                logger.debug("[RobotCommandAckConsumer] Duplicate ACK message: {}", messageId);
                ack.acknowledge();
                return;
            }

            wsTrafficLogger.log(deviceId, "IN", "ACK", message, timestamp);

            if (messageId != null) {
                dedupeService.markProcessed(messageId);
            }

            logger.debug("[RobotCommandAckConsumer] ACK audited for device {}", robotId);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[RobotCommandAckConsumer] Error processing ACK: {}", e.getMessage(), e);
            ack.acknowledge();
        }
    }
}
