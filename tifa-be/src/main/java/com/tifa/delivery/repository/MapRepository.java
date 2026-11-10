package com.tifa.delivery.repository;

import com.tifa.delivery.entity.Map;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MapRepository extends JpaRepository<Map, Long> {
    Optional<Map> findByMapName(String mapName);
}
