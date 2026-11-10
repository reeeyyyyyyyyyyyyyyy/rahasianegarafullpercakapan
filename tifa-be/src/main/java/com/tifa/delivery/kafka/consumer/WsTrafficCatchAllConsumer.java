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

/**
 * WS Traffic Catch-All Consumer
 *
 * Subscribes to topics that receive previously-unhandled message codes:
 * - ws.misc.ui → PICKUP_CONFIRM, PICKUP_CANCEL, INTERRUPT, INTERRUPT_CONFIRM,
 * INTERRUPT_CANCEL, ARRIVAL_CONFIRM, ARRIVAL_CANCEL, ERROR, INIT,
 * and ANY future unknown UI codes
 * - ws.misc.robot → MOVE_COMPLETED, ERROR, INIT (robot-side), and any future
 * unknown codes
 * - ui.command.scs → Speed Control Set (had a topic but no consumer)
 * - ui.command.map_selected → Map selection command (new feature)
 *
 * All messages are inserted into h_ws_traffic for full audit coverage.
 */
@Component
public class WsTrafficCatchAllConsumer {

    private static final Logger logger = LoggerFactory.getLogger(WsTrafficCatchAllConsumer.class);

    private final ObjectMapper objectMapper;
    private final DeviceResolverService deviceResolver;
    private final MessageDedupeService dedupeService;
    private final WsTrafficLogger wsTrafficLogger;

    public WsTrafficCatchAllConsumer(ObjectMapper objectMapper,
            DeviceResolverService deviceResolver,
            MessageDedupeService dedupeService,
            WsTrafficLogger wsTrafficLogger) {
        this.objectMapper = objectMapper;
        this.deviceResolver = deviceResolver;
        this.dedupeService = dedupeService;
        this.wsTrafficLogger = wsTrafficLogger;
    }

    /**
     * Catch-all for unknown/misc UI codes routed from tifa-ws generic fallback.
     */
    @KafkaListener(topics = { "ws.misc.ui", "ui.command.scs",
            "ui.command.map_selected",
            "ui.command.pickup_confirm", "ui.command.pickup_cancel",
            "ui.command.interrupt", "ui.command.interrupt_confirm", "ui.command.interrupt_cancel",
            "ui.command.arrival_confirm", "ui.command.arrival_cancel",
            "ui.command.speed"
        }, groupId = "tifa-backend-group")
    public void consumeMiscUi(String message, Acknowledgment ack) {
        consume(message, ack, "IN");
    }

    /**
     * Catch-all for unknown/misc Robot codes routed from tifa-ws generic fallback.
     */
    @KafkaListener(topics = { "ws.misc.robot", "robot.events.move_completed", "robot.events.init" }, groupId = "tifa-backend-group")
    public void consumeMiscRobot(String message, Acknowledgment ack) {
        consume(message, ack, "IN");
    }

    private void consume(String message, Acknowledgment ack, String direction) {
        try {
            JsonNode json = objectMapper.readTree(message);

            String messageId = json.has("message_id") ? json.get("message_id").asText() : null;
            String code = json.has("code") ? json.get("code").asText() : "UNKNOWN";
            String originId = resolveOriginId(json);

            if (messageId != null && dedupeService.isDuplicate(messageId)) {
                logger.debug("[CatchAll] Duplicate {}: {}", code, messageId);
                ack.acknowledge();
                return;
            }

            Integer deviceId = deviceResolver.getOrCreateDeviceId(originId);
            wsTrafficLogger.logNow(deviceId, direction, code, message);

            if (messageId != null) {
                dedupeService.markProcessed(messageId);
            }

            logger.info("[CatchAll] Audited {} from {} (device_id={})", code, originId, deviceId);
            ack.acknowledge();

        } catch (Exception e) {
            logger.error("[CatchAll] Error processing message: {}", e.getMessage(), e);
            ack.acknowledge();
        }
    }

    /**
     * Tries to resolve an origin identifier from common field locations.
     */
    private String resolveOriginId(JsonNode json) {
        if (json.has("origin_id"))
            return json.get("origin_id").asText();
        JsonNode data = json.get("data");
        if (data != null) {
            if (data.has("robot_id"))
                return data.get("robot_id").asText();
            if (data.has("device_id"))
                return data.get("device_id").asText();
            if (data.has("ui_id"))
                return data.get("ui_id").asText();
        }
        return "UNKNOWN";
    }
}
