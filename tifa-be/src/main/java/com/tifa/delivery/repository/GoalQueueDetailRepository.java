package com.tifa.delivery.repository;

import com.tifa.delivery.entity.GoalQueueDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GoalQueueDetailRepository extends JpaRepository<GoalQueueDetail, Long> {
    
    List<GoalQueueDetail> findByGoalQueueIdOrderBySequenceOrderAsc(Long goalQueueId);
    
    @Query("SELECT d FROM GoalQueueDetail d WHERE d.goalQueueId = :queueId " +
           "AND d.status = 'IN_PROGRESS' ORDER BY d.sequenceOrder ASC")
    Optional<GoalQueueDetail> findCurrentTray(@Param("queueId") Long queueId);
    
    @Query("SELECT d FROM GoalQueueDetail d WHERE d.goalQueueId = :queueId " +
           "AND d.status = 'QUEUED' ORDER BY d.sequenceOrder ASC")
    List<GoalQueueDetail> findPendingTrays(@Param("queueId") Long queueId);
}
