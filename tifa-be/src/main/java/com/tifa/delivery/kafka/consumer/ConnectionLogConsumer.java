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
 * Connection Log Consumer
 * Tracks WebSocket connections to h_connection_log
 * Consumes ws.session.* topics
 */
@Component
public class ConnectionLogConsumer {

    private static final Logger logger = LoggerFactory.getLogger(ConnectionLogConsumer.class);
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final DeviceResolverService deviceResolver;
    private final MessageDedupeService dedupeService;
    private final WsTrafficLogger wsTrafficLogger;

    public ConnectionLogConsumer(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper,
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
     * Consume ws.session.connect (when SI received from UI or Robot)
     */
    @KafkaListener(topics = "ws.session.connect", groupId = "tifa-backend-group")
    public void consumeConnect(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            String originId = json.get("origin_id").asText();
            String connectionType = json.has("connection_type") ? json.get("connection_type").asText() : "OTHER";
            String remoteAddr = json.has("remote_addr") ? json.get("remote_addr").asText() : null;
            String localAddr = json.has("local_addr") ? json.get("local_addr").asText() : null;
            Timestamp connectedAt = Timestamp.from(Instant.parse(json.get("timestamp").asText()));

            if (dedupeService.isDuplicate(messageId)) {
                logger.debug("[ConnectionLogConsumer] Duplicate connect event: {}", messageId);
                ack.acknowledge();
                return;
            }

            Integer deviceId = deviceResolver.getOrCreateDeviceId(originId);
            if (deviceId == null) {
                logger.error("[ConnectionLogConsumer] Unable to resolve device_id for {}", originId);
                ack.acknowledge();
                return;
            }

            // Insert to h_connection_log
            jdbcTemplate.update(
                    "INSERT INTO h_connection_log (device_id, connection_type, remote_addr, local_addr, connected_at, session_info) "
                            +
                            "VALUES (?, ?::connection_type_t, ?::inet, ?::inet, ?, ?::jsonb)",
                    deviceId, connectionType, remoteAddr, localAddr, connectedAt, message);

            wsTrafficLogger.log(deviceId, "IN", "SI", message, remoteAddr, connectedAt);
            dedupeService.markProcessed(messageId);

            logger.info("[ConnectionLogConsumer] ✅ Connection logged: {} from {}", originId, remoteAddr);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[ConnectionLogConsumer] Error processing connect: {}", e.getMessage());
            ack.acknowledge();
        }
    }

    /**
     * Consume ws.session.disconnect
     */
    @KafkaListener(topics = "ws.session.disconnect", groupId = "tifa-backend-group")
    public void consumeDisconnect(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            String originId = json.get("origin_id").asText();
            String remoteAddr = json.has("remote_addr") ? json.get("remote_addr").asText() : null;
            Timestamp disconnectedAt = Timestamp.from(Instant.parse(json.get("timestamp").asText()));

            if (dedupeService.isDuplicate(messageId)) {
                ack.acknowledge();
                return;
            }

            Integer deviceId = deviceResolver.getOrCreateDeviceId(originId);
            if (deviceId == null) {
                ack.acknowledge();
                return;
            }

            // Update most recent open connection for this device
            int updated = jdbcTemplate.update(
                    "UPDATE h_connection_log SET disconnected_at = ? " +
                            "WHERE h_connection_log_id = (" +
                            "  SELECT h_connection_log_id FROM h_connection_log " +
                            "  WHERE device_id = ? AND disconnected_at IS NULL " +
                            "  ORDER BY connected_at DESC LIMIT 1" +
                            ")",
                    disconnectedAt, deviceId);

            if (updated > 0) {
                logger.info("[ConnectionLogConsumer] ✅ Disconnection logged: {} from {}", originId, remoteAddr);
            }

            wsTrafficLogger.log(deviceId, "IN", "DISCONNECT", message, remoteAddr, disconnectedAt);
            dedupeService.markProcessed(messageId);

            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[ConnectionLogConsumer] Error processing disconnect: {}", e.getMessage());
            ack.acknowledge();
        }
    }
}
