package com.tifa.delivery.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import java.time.Instant;

/**
 * Map entity (m_map)
 */
@Entity
@Table(name = "m_map")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Map {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "map_id")
    private Long mapId;

    @Column(name = "map_name", nullable = false, unique = true, length = 255)
    private String mapName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "map_floor", length = 64)
    private String mapFloor;

    @Column(name = "is_active")
    private Integer isActive;

    @Column(name = "file_group_id")
    private Long fileGroupId;

    @Column(name = "created_by")
    private Long createdBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;
}
