package com.tifa.delivery.repository;

import com.tifa.delivery.entity.CommandLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommandLogRepository extends JpaRepository<CommandLog, Long> {
    List<CommandLog> findByDeviceIdOrderByCreatedAtDesc(Long deviceId);
}
