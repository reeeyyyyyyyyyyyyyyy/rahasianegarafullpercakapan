package com.tifa.delivery.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * WS Traffic Entity
 * Represents the h_ws_traffic audit table.
 *
 * Column mapping matches actual DB schema:
 * - device_id (FK to m_device)
 * - direction (IN/OUT)
 * - code (message code e.g. OP, MOVE, POSITION)
 * - payload (jsonb)
 * - remote_addr (inet, nullable)
 * - recorded_at (timestamp)
 */
@Entity
@Table(name = "h_ws_traffic")
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WsTraffic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "h_ws_traffic_id")
    private Long id;

    @Column(name = "device_id")
    private Integer deviceId;

    @Column(name = "direction", length = 3)
    private String direction;

    @Column(name = "code", length = 64)
    private String code;

    @Type(type = "jsonb")
    @Column(name = "payload", columnDefinition = "jsonb")
    private String payload;

    @Column(name = "remote_addr", length = 45)
    private String remoteAddr;

    @CreationTimestamp
    @Column(name = "recorded_at")
    private LocalDateTime recordedAt;
}
