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
 * Command Log entity (h_command_log)
 * Replaces Kafka h_command_log topic
 */
@Entity
@Table(name = "h_command_log")
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommandLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "h_command_log_id")
    private Long commandLogId;

    @Column(name = "device_id")
    private Long deviceId;

    @Column(name = "command_code", length = 64)
    private String commandCode; // MOVE, MODE, SHB, DM, EXP, CANCEL

    @Type(type = "jsonb")
    @Column(name = "command_payload", columnDefinition = "jsonb")
    private String commandPayload;

    @Column(name = "status", length = 64)
    private String status; // QUEUED, SENT, ACKED, FAILED

    @Column(name = "status_message", columnDefinition = "TEXT")
    private String statusMessage;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
}
