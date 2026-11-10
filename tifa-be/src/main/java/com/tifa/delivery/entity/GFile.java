package com.tifa.delivery.entity;

import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

import javax.persistence.*;
import java.time.Instant;

/**
 * File entity (g_file)
 * Individual files within a group
 */
@Entity
@Table(name = "g_file")
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "g_file_id")
    private Long gFileId;

    @Column(name = "file_group_id")
    private Long fileGroupId;

    @Column(name = "file_name", nullable = false, length = 1024)
    private String fileName;

    @Column(name = "file_path", nullable = false, columnDefinition = "TEXT")
    private String filePath;

    @Column(name = "file_type", length = 64)
    private String fileType; // 'pgm', 'yaml', 'json'

    @Column(name = "file_size")
    private Long fileSize;

    @Type(type = "jsonb")
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata;

    @Column(name = "uploaded_by")
    private Long uploadedBy;

    @Column(name = "uploaded_at")
    private Instant uploadedAt = Instant.now();
}
