package com.tifa.delivery.service;

import com.tifa.delivery.entity.Goal;
import com.tifa.delivery.repository.GoalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Goal/Waypoint Service
 * Manages navigation waypoints and markers on maps
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class GoalService {

    private final GoalRepository goalRepository;

    /**
     * Get all waypoints for a map
     */
    public List<Goal> getGoalsByMap(Long mapId) {
        log.info("Getting goals for map: {}", mapId);
        return goalRepository.findByMapIdOrderByTypeAndName(mapId);
    }

    /**
     * Get waypoints by type (e.g., only tables)
     */
    public List<Goal> getGoalsByMapAndType(Long mapId, Goal.GoalType goalType) {
        log.info("Getting goals for map: {} and type: {}", mapId, goalType);
        return goalRepository.findByMapIdAndGoalType(mapId, goalType);
    }

    /**
     * Get single waypoint by ID
     */
    public Optional<Goal> getGoalById(Long goalId) {
        return goalRepository.findById(goalId);
    }

    /**
     * Get waypoint by code
     */
    public Optional<Goal> getGoalByCode(String goalCode) {
        return goalRepository.findByGoalCode(goalCode);
    }

    /**
     * Create new waypoint
     */
    @Transactional
    public Goal createGoal(Goal goal) {
        log.info("Creating new goal: {} on map: {}", goal.getGoalName(), goal.getMapId());

        // Validate goal code uniqueness
        if (goal.getGoalCode() != null && goalRepository.existsByGoalCode(goal.getGoalCode())) {
            throw new RuntimeException("Goal code already exists: " + goal.getGoalCode());
        }

        // Auto-generate goal code if not provided
        if (goal.getGoalCode() == null) {
            goal.setGoalCode(generateGoalCode(goal));
        }

        // Set default yaw if not provided
        if (goal.getYaw() == null) {
            goal.setYaw(0.0);
        }

        return goalRepository.save(goal);
    }

    /**
     * Update existing waypoint
     */
    @Transactional
    public Goal updateGoal(Long goalId, Goal updatedGoal) {
        log.info("Updating goal: {}", goalId);

        Goal existing = goalRepository.findById(goalId)
                .orElseThrow(() -> new RuntimeException("Goal not found: " + goalId));

        // Update fields
        if (updatedGoal.getGoalName() != null) {
            existing.setGoalName(updatedGoal.getGoalName());
        }
        if (updatedGoal.getGoalType() != null) {
            existing.setGoalType(updatedGoal.getGoalType());
        }
        if (updatedGoal.getX() != null) {
            existing.setX(updatedGoal.getX());
        }
        if (updatedGoal.getY() != null) {
            existing.setY(updatedGoal.getY());
        }
        if (updatedGoal.getYaw() != null) {
            existing.setYaw(updatedGoal.getYaw());
        }
        if (updatedGoal.getMetadata() != null) {
            existing.setMetadata(updatedGoal.getMetadata());
        }

        return goalRepository.save(existing);
    }

    /**
     * Delete waypoint
     */
    @Transactional
    public void deleteGoal(Long goalId) {
        log.info("Deleting goal: {}", goalId);

        if (!goalRepository.existsById(goalId)) {
            throw new RuntimeException("Goal not found: " + goalId);
        }

        goalRepository.deleteById(goalId);
    }

    /**
     * Batch create waypoints
     */
    @Transactional
    public List<Goal> createGoalsBatch(List<Goal> goals) {
        log.info("Creating {} goals in batch", goals.size());

        List<Goal> result = new ArrayList<>();
        for (Goal goal : goals) {
            // Auto-generate goal code if not provided
            if (goal.getGoalCode() == null) {
                goal.setGoalCode(generateGoalCode(goal));
            }
            
            // Set default yaw if not provided
            if (goal.getYaw() == null) {
                goal.setYaw(0.0);
            }

            result.add(goalRepository.save(goal));
        }

        return result;
    }

    /**
     * Get waypoint statistics for a map
     */
    public Map<String, Object> getGoalStatistics(Long mapId) {
        List<Goal> goals = goalRepository.findByMapId(mapId);

        Map<String, Long> typeCount = new HashMap<>();
        for (Goal goal : goals) {
            String type = goal.getGoalType() != null ? goal.getGoalType().name() : "UNKNOWN";
            typeCount.put(type, typeCount.getOrDefault(type, 0L) + 1);
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalGoals", goals.size());
        stats.put("typeBreakdown", typeCount);
        stats.put("mapId", mapId);

        return stats;
    }

    /**
     * Generate unique goal code
     */
    private String generateGoalCode(Goal goal) {
        String prefix = goal.getGoalType() != null ? goal.getGoalType().name().substring(0, 3) : "WPT";
        String base = prefix + "_MAP" + goal.getMapId() + "_";
        
        int counter = 1;
        String code;
        do {
            code = base + String.format("%03d", counter);
            counter++;
        } while (goalRepository.existsByGoalCode(code));

        return code;
    }

    /**
     * Find nearest waypoint to given position
     */
    public Optional<Goal> findNearestGoal(Long mapId, Double x, Double y, Double maxDistance) {
        List<Goal> goals = goalRepository.findByMapId(mapId);

        Goal nearest = null;
        double minDistance = maxDistance != null ? maxDistance : Double.MAX_VALUE;

        for (Goal goal : goals) {
            if (goal.getX() == null || goal.getY() == null) continue;

            double distance = Math.sqrt(
                Math.pow(goal.getX() - x, 2) + Math.pow(goal.getY() - y, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearest = goal;
            }
        }

        return Optional.ofNullable(nearest);
    }
}
