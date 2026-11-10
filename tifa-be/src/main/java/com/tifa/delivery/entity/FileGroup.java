package com.tifa.delivery.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.Instant;

/**
 * File Group entity (g_file_group)
 * Groups related files (PGM + YAML + JSON for one map version)
 */
@Entity
@Table(name = "g_file_group")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "file_group_id")
    private Long fileGroupId;

    @Column(name = "group_name", length = 255)
    private String groupName;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
}
