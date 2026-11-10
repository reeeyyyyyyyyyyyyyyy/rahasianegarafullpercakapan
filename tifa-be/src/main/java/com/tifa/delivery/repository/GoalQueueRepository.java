package com.tifa.delivery.repository;

import com.tifa.delivery.entity.GoalQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GoalQueueRepository extends JpaRepository<GoalQueue, Long> {
    // Query GoalQueue by Device's deviceId field and GoalQueue status
    List<GoalQueue> findByDeviceDeviceIdAndStatus(Long deviceId, GoalQueue.GoalQueueStatus status);
}
