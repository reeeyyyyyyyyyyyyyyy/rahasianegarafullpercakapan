package com.tifa.delivery.controller;

import com.tifa.delivery.dto.CommandLogRequest;
import com.tifa.delivery.service.CommandLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * WebSocket Controller for v3
 * Called by WS Cloud Router to log commands (replaces Kafka h_command_log topic)
 */
@RestController
@RequestMapping("/api/ws")
@RequiredArgsConstructor
@Slf4j
public class WSController {

    private final CommandLogService commandLogService;

    /**
     * POST /api/ws/log-command
     * Called by WS Cloud Router after forwarding command to robot
     * Logs command to h_command_log table (replaces Kafka)
     * 
     * Request body:
     * {
     *   "robotId": "RB1",
     *   "commandCode": "MOVE",
     *   "payload": "{\"trayNumber\":1,\"x\":10.5,\"y\":20.3,\"yaw\":1.57}",
     *   "uiId": "ui_123",
     *   "timestamp": 1641024000000
     * }
     */
    @PostMapping("/log-command")
    public ResponseEntity<Map<String, Object>> logCommand(@RequestBody CommandLogRequest request) {
        log.info("Command log request: robotId={}, commandCode={}", 
                 request.getRobotId(), request.getCommandCode());

        try {
            commandLogService.logCommand(request);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Command logged successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Command logging failed: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Command logging failed: " + e.getMessage());
            // Return 200 even on error to not block WS Router
            return ResponseEntity.ok(error);
        }
    }
}
