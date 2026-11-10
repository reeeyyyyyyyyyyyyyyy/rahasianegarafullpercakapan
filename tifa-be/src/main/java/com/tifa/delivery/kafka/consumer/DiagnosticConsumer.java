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
 * DM (Diagnostic Mode) Consumer
 * Consumes ui.command.dm topic
 * Records diagnostic mode to h_state and h_command_log
 */
@Component
public class DiagnosticConsumer {

    private static final Logger logger = LoggerFactory.getLogger(DiagnosticConsumer.class);
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final DeviceResolverService deviceResolver;
    private final MessageDedupeService dedupeService;
    private final WsTrafficLogger wsTrafficLogger;

    public DiagnosticConsumer(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper,
            DeviceResolverService deviceResolver,
            MessageDedupeService dedupeService,
            WsTrafficLogger wsTrafficLogger) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.deviceResolver = deviceResolver;
        this.dedupeService = dedupeService;
        this.wsTrafficLogger = wsTrafficLogger;
    }

    @KafkaListener(topics = "ui.command.dm", groupId = "tifa-backend-group")
    public void consumeDiagnostic(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.get("message_id").asText();
            Timestamp timestamp = Timestamp.from(Instant.parse(json.get("timestamp").asText()));

            if (dedupeService.isDuplicate(messageId)) {
                logger.debug("[DiagnosticConsumer] Duplicate message_id={}, skipping", messageId);
                ack.acknowledge();
                return;
            }

            JsonNode data = json.get("data");
            String deviceCode = data.get("device_code").asText();
            String robotActivity = data.has("robot_activity")
                    ? data.get("robot_activity").asText()
                    : "DIAGNOSTIC_RUNNING";

            logger.info("[DiagnosticConsumer] Processing DM for device_code={}, activity={}",
                    deviceCode, robotActivity);

            Integer deviceId = deviceResolver.getOrCreateDeviceId(deviceCode);
            if (deviceId == null) {
                logger.error("[DiagnosticConsumer] Unable to resolve device_id for device_code={}", deviceCode);
                ack.acknowledge();
                return;
            }

            // Insert into h_state with robot_mode='DIAGNOSTIC'
            jdbcTemplate.update(
                    "INSERT INTO h_state (device_id, robot_mode, robot_activity, raw_payload, recorded_at) " +
                            "VALUES (?, 'DIAGNOSTIC', ?, ?::jsonb, ?)",
                    deviceId, robotActivity, message, timestamp);

            // Insert into h_command_log
            jdbcTemplate.update(
                    "INSERT INTO h_command_log (device_id, command_code, command_payload, status, status_message, created_at) "
                            +
                            "VALUES (?, 'DM', ?::jsonb, ?, ?, ?)",
                    deviceId, message, "RUNNING", "Diagnostic mode activated: " + robotActivity, timestamp);

            wsTrafficLogger.log(deviceId, "IN", "DM", message, timestamp);
            dedupeService.markProcessed(messageId);

            logger.info("[DiagnosticConsumer] ✅ Recorded diagnostic for device_id={} ({})", deviceId, deviceCode);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[DiagnosticConsumer] Error processing DM: {}", e.getMessage(), e);
            ack.acknowledge();
        }
    }
}
