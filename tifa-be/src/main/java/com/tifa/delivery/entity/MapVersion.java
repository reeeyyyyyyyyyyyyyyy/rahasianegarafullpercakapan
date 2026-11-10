package com.tifa.delivery.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.Instant;

/**
 * Map Version entity (m_map_version)
 * Track map versions
 */
@Entity
@Table(name = "m_map_version")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MapVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "map_version_id")
    private Long mapVersionId;

    @Column(name = "map_id", nullable = false)
    private Long mapId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber = 1;

    @Column(name = "gfile_group_id")
    private Long gfileGroupId;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "changelog", columnDefinition = "TEXT")
    private String changelog;
}
