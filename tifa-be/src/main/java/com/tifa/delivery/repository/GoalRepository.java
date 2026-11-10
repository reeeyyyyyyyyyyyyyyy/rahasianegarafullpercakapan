package com.tifa.delivery.repository;

import com.tifa.delivery.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GoalRepository extends JpaRepository<Goal, Long> {
    
    List<Goal> findByMapId(Long mapId);
    
    List<Goal> findByMapIdAndGoalType(Long mapId, Goal.GoalType goalType);
    
    Optional<Goal> findByGoalCode(String goalCode);
    
    Optional<Goal> findByMapIdAndGoalCode(Long mapId, String goalCode);
    
    @Query("SELECT g FROM Goal g WHERE g.mapId = :mapId ORDER BY g.goalType, g.goalName")
    List<Goal> findByMapIdOrderByTypeAndName(Long mapId);
    
    boolean existsByGoalCode(String goalCode);
    
    boolean existsByMapIdAndGoalCode(Long mapId, String goalCode);
}
