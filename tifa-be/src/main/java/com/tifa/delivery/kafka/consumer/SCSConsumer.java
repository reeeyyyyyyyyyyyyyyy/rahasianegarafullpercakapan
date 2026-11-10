package com.tifa.delivery.kafka.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;

/**
 * SCS (Set Charging Station) Consumer
 * Consumes ui.command.scs topic
 * Stores robot charging station location in m_goal and t_robot_goal
 * 
 * Required behavior:
 * 1. Parse device_id, map_id, x, y, yaw from message
 * 2. INSERT into m_goal to create a new goal entry
 * 3. Get the newly created goal_id
 * 4. Delete existing CHARGE mapping for device
 * 5. Insert new CHARGE mapping into t_robot_goal with the new goal_id
 */
@Component
public class SCSConsumer {

    private static final Logger logger = LoggerFactory.getLogger(SCSConsumer.class);
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public SCSConsumer(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }
    
    @KafkaListener(topics = "ui.command.scs", groupId = "tifa-backend-group")
    public void consumeSCS(String message, Acknowledgment ack) {
        try {
            JsonNode json = objectMapper.readTree(message);
            JsonNode data = json.get("data");
            
            String deviceCode = data.get("device_code").asText();
            long mapId = data.get("map_id").asLong();
            double x = data.get("x").asDouble();
            double y = data.get("y").asDouble();
            double yaw = data.get("yaw").asDouble();
            
            logger.info("[SCSConsumer] Processing SCS for device_code={}, map_id={}, x={}, y={}, yaw={}", 
                deviceCode, mapId, x, y, yaw);
            
            // Lookup device_id from m_device using device_code
            Long deviceId;
            try {
                deviceId = jdbcTemplate.queryForObject(
                    "SELECT device_id FROM m_device WHERE device_code = ?",
                    Long.class,
                    deviceCode
                );
                logger.info("[SCSConsumer] Device lookup: device_code={} → device_id={}", deviceCode, deviceId);
            } catch (EmptyResultDataAccessException e) {
                logger.error("[SCSConsumer] Device not found: device_code={}", deviceCode);
                ack.acknowledge();
                return;
            }
            
            // Insert new CHARGE goal into m_goal
            Long newGoalId = jdbcTemplate.queryForObject(
                "INSERT INTO m_goal (map_id, goal_code, goal_name, goal_type, x, y, yaw, created_at) " +
                "VALUES (?, ?, ?, 'CHARGE', ?, ?, ?, NOW()) " +
                "RETURNING goal_id",
                Long.class,
                mapId, 
                "CHARGE_" + deviceCode + "_" + System.currentTimeMillis(), 
                "Charging Station for Device " + deviceCode,
                x, y, yaw
            );
            
            logger.info("[SCSConsumer] Created new CHARGE goal: goal_id={}", newGoalId);
            
            // Delete existing CHARGE mapping for this device
            int deleted = jdbcTemplate.update(
                "DELETE FROM t_robot_goal WHERE device_id = ? AND goal_type = 'CHARGE'",
                deviceId
            );
            
            if (deleted > 0) {
                logger.info("[SCSConsumer] Deleted old CHARGE mapping for device_id={}", deviceId);
            }
            
            // Insert new CHARGE mapping into t_robot_goal
            int inserted = jdbcTemplate.update(
                "INSERT INTO t_robot_goal (device_id, map_id, goal_id, goal_type, created_at, updated_at) " +
                "VALUES (?, ?, ?, 'CHARGE', NOW(), NOW())",
                deviceId, mapId, newGoalId
            );
            
            if (inserted > 0) {
                logger.info("[SCSConsumer] ✅ Set charging station for device_id={} ({}) to goal_id={}", 
                    deviceId, deviceCode, newGoalId);
            }
            
            // Audit to h_command_log
            jdbcTemplate.update(
                "INSERT INTO h_command_log (device_id, command_code, command_payload, status, created_at) " +
                "VALUES (?, 'SCS', ?::jsonb, 'COMPLETED', NOW())",
                deviceId, message
            );
            
            ack.acknowledge();
            
        } catch (Exception e) {
            logger.error("[SCSConsumer] Error processing SCS: {}", e.getMessage(), e);
            ack.acknowledge();
        }
    }
}
