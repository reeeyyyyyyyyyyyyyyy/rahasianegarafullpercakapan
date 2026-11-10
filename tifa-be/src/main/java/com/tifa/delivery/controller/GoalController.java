package com.tifa.delivery.controller;

import com.tifa.delivery.entity.Goal;
import com.tifa.delivery.service.GoalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Goal/Waypoint Controller
 * REST API for managing navigation waypoints and markers
 */
@RestController
@RequestMapping("/api/waypoints")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class GoalController {

    private final GoalService goalService;

    /**
     * Get all waypoints for a map
     * GET /api/waypoints?mapId=1
     */
    @GetMapping
    public ResponseEntity<List<Goal>> getWaypoints(
            @RequestParam Long mapId,
            @RequestParam(required = false) String type) {
        
        log.info("Get waypoints for map: {}, type: {}", mapId, type);

        try {
            List<Goal> goals;
            if (type != null) {
                Goal.GoalType goalType = Goal.GoalType.valueOf(type.toUpperCase());
                goals = goalService.getGoalsByMapAndType(mapId, goalType);
            } else {
                goals = goalService.getGoalsByMap(mapId);
            }
            return ResponseEntity.ok(goals);
        } catch (IllegalArgumentException e) {
            log.error("Invalid goal type: {}", type);
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Failed to get waypoints: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get single waypoint by ID
     * GET /api/waypoints/123
     */
    @GetMapping("/{goalId}")
    public ResponseEntity<Goal> getWaypoint(@PathVariable Long goalId) {
        log.info("Get waypoint: {}", goalId);

        return goalService.getGoalById(goalId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get waypoint by code
     * GET /api/waypoints/code/TABLE_001
     */
    @GetMapping("/code/{goalCode}")
    public ResponseEntity<Goal> getWaypointByCode(@PathVariable String goalCode) {
        log.info("Get waypoint by code: {}", goalCode);

        return goalService.getGoalByCode(goalCode)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create new waypoint
     * POST /api/waypoints
     * 
     * Body:
     * {
     *   "mapId": 1,
     *   "goalCode": "TABLE_001",
     *   "goalName": "Table 1",
     *   "goalType": "TABLE",
     *   "x": 2.5,
     *   "y": 3.0,
     *   "yaw": 0,
     *   "metadata": "{\"capacity\": 4, \"section\": \"A\"}"
     * }
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> createWaypoint(@RequestBody Goal goal) {
        log.info("Create waypoint: {} on map: {}", goal.getGoalName(), goal.getMapId());

        try {
            Goal created = goalService.createGoal(goal);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("goalId", created.getGoalId());
            response.put("goalCode", created.getGoalCode());
            response.put("message", "Waypoint created successfully");
            response.put("data", created);

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            log.error("Failed to create waypoint: {}", e.getMessage());
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "CREATION_FAILED");
            error.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            log.error("Failed to create waypoint: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update waypoint
     * PUT /api/waypoints/123
     */
    @PutMapping("/{goalId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updateWaypoint(
            @PathVariable Long goalId,
            @RequestBody Goal goal) {
        
        log.info("Update waypoint: {}", goalId);

        try {
            Goal updated = goalService.updateGoal(goalId, goal);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("goalId", updated.getGoalId());
            response.put("message", "Waypoint updated successfully");
            response.put("data", updated);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Failed to update waypoint: {}", e.getMessage());
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "UPDATE_FAILED");
            error.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            log.error("Failed to update waypoint: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete waypoint
     * DELETE /api/waypoints/123
     */
    @DeleteMapping("/{goalId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> deleteWaypoint(@PathVariable Long goalId) {
        log.info("Delete waypoint: {}", goalId);

        try {
            goalService.deleteGoal(goalId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("goalId", goalId);
            response.put("message", "Waypoint deleted successfully");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Failed to delete waypoint: {}", e.getMessage());
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "DELETE_FAILED");
            error.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            log.error("Failed to delete waypoint: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Batch create waypoints
     * POST /api/waypoints/batch
     * 
     * Body:
     * [
     *   { "mapId": 1, "goalName": "Table 1", ... },
     *   { "mapId": 1, "goalName": "Table 2", ... }
     * ]
     */
    @PostMapping("/batch")
    public ResponseEntity<Map<String, Object>> createWaypointsBatch(@RequestBody List<Goal> goals) {
        log.info("Create {} waypoints in batch", goals.size());

        try {
            List<Goal> created = goalService.createGoalsBatch(goals);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", created.size());
            response.put("message", "Waypoints created successfully");
            response.put("data", created);

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to create waypoints batch: {}", e.getMessage(), e);
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "BATCH_CREATION_FAILED");
            error.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get waypoint statistics for a map
     * GET /api/waypoints/stats?mapId=1
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getWaypointStats(@RequestParam Long mapId) {
        log.info("Get waypoint statistics for map: {}", mapId);

        try {
            Map<String, Object> stats = goalService.getGoalStatistics(mapId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Failed to get waypoint stats: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Find nearest waypoint to position
     * GET /api/waypoints/nearest?mapId=1&x=2.5&y=3.0&maxDistance=5.0
     */
    @GetMapping("/nearest")
    public ResponseEntity<?> findNearestWaypoint(
            @RequestParam Long mapId,
            @RequestParam Double x,
            @RequestParam Double y,
            @RequestParam(required = false) Double maxDistance) {
        
        log.info("Find nearest waypoint to ({}, {}) on map: {}", x, y, mapId);

        try {
            return goalService.findNearestGoal(mapId, x, y, maxDistance)
                    .map(goal -> {
                        double distance = Math.sqrt(
                            Math.pow(goal.getX() - x, 2) + Math.pow(goal.getY() - y, 2)
                        );
                        
                        Map<String, Object> response = new HashMap<>();
                        response.put("found", true);
                        response.put("waypoint", goal);
                        response.put("distance", distance);
                        
                        return ResponseEntity.ok(response);
                    })
                    .orElseGet(() -> {
                        Map<String, Object> response = new HashMap<>();
                        response.put("found", false);
                        response.put("message", "No waypoint found within distance");
                        return ResponseEntity.ok(response);
                    });
        } catch (Exception e) {
            log.error("Failed to find nearest waypoint: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
