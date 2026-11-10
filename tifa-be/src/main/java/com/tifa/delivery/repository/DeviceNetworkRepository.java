package com.tifa.delivery.repository;

import com.tifa.delivery.entity.DeviceNetwork;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DeviceNetworkRepository extends JpaRepository<DeviceNetwork, Long> {
    Optional<DeviceNetwork> findFirstByDeviceIdOrderByLastSeenDesc(Long deviceId);
}
