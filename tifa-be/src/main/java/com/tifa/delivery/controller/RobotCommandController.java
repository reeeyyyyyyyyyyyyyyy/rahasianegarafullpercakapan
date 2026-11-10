package com.tifa.delivery.controller;

import com.tifa.delivery.dto.RobotCommandRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Robot Command Controller
 * Handles commands from Dashboard/UI → WS Router → Robot
 * Path: Dashboard → REST API (this) → WS Router (WebSocket proxy) → Robot
 */
@RestController
@RequestMapping("/api/robot")
@CrossOrigin(origins = "*")
public class RobotCommandController {

    @Value("${ws.cloud.router.url:http://localhost:3001}")
    private String wsRouterUrl;

    @Autowired
    private RestTemplate restTemplate;

    /**
     * POST /api/robot/command/move
     * Send move_base command to robot via WS Router
     * 
     * Example request:
     * {
     *   "deviceCode": "RB001",
     *   "goalX": 10.5,
     *   "goalY": 5.2,
     *   "goalYaw": 0.0,
     *   "goalType": "DELIVERY"
     * }
     */
    @PostMapping("/command/move")
    public ResponseEntity<Map<String, Object>> sendMoveCommand(@RequestBody RobotCommandRequest request) {
        try {
            // Forward to WS Router (which has WebSocket connection to robot)
            String wsEndpoint = wsRouterUrl + "/api/command/move";
            
            Map<String, Object> payload = new HashMap<>();
            payload.put("deviceCode", request.getDeviceCode());
            payload.put("goalX", request.getGoalX());
            payload.put("goalY", request.getGoalY());
            payload.put("goalYaw", request.getGoalYaw());
            payload.put("goalType", request.getGoalType() != null ? request.getGoalType() : "WAYPOINT");

            ResponseEntity<Map> response = restTemplate.postForEntity(wsEndpoint, payload, Map.class);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Command sent to robot via WS Router",
                    "deviceCode", request.getDeviceCode()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "error", e.getMessage()
                    ));
        }
    }

    /**
     * POST /api/robot/command/mode
     * Send set_mode command to robot
     * 
     * Example request:
     * {
     *   "deviceCode": "RB001",
     *   "mode": "AUTO"
     * }
     */
    @PostMapping("/command/mode")
    public ResponseEntity<Map<String, Object>> sendModeCommand(@RequestBody Map<String, String> request) {
        try {
            String wsEndpoint = wsRouterUrl + "/api/command/mode";
            restTemplate.postForEntity(wsEndpoint, request, Map.class);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Mode command sent to robot",
                    "deviceCode", request.get("deviceCode"),
                    "mode", request.get("mode")
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "error", e.getMessage()
                    ));
        }
    }

    /**
     * POST /api/robot/command/emergency-stop
     * Send emergency stop command to robot
     */
    @PostMapping("/command/emergency-stop")
    public ResponseEntity<Map<String, Object>> sendEmergencyStop(@RequestBody Map<String, String> request) {
        try {
            String wsEndpoint = wsRouterUrl + "/api/command/emergency-stop";
            restTemplate.postForEntity(wsEndpoint, request, Map.class);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "EMERGENCY STOP sent to robot",
                    "deviceCode", request.get("deviceCode")
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "error", e.getMessage()
                    ));
        }
    }

    /**
     * POST /api/robot/command/cancel-goal
     * Cancel current goal
     */
    @PostMapping("/command/cancel-goal")
    public ResponseEntity<Map<String, Object>> sendCancelGoal(@RequestBody Map<String, String> request) {
        try {
            String wsEndpoint = wsRouterUrl + "/api/command/cancel-goal";
            restTemplate.postForEntity(wsEndpoint, request, Map.class);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Cancel goal command sent",
                    "deviceCode", request.get("deviceCode")
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "error", e.getMessage()
                    ));
        }
    }
}
