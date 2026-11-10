package com.tifa.delivery.repository;

import com.tifa.delivery.entity.MapVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MapVersionRepository extends JpaRepository<MapVersion, Long> {
    
    Optional<MapVersion> findFirstByMapIdOrderByVersionNumberDesc(Long mapId);
    
    @Query("SELECT COALESCE(MAX(mv.versionNumber), 0) FROM MapVersion mv WHERE mv.mapId = :mapId")
    Integer getMaxVersionNumber(@Param("mapId") Long mapId);
}
