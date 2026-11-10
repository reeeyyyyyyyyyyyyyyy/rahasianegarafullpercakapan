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
 * Device Network entity (m_device_network)
 * For fallback routing to robot hotspot WS
 */
@Entity
@Table(name = "m_device_network")
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeviceNetwork {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "network_id")
    private Long networkId;

    @Column(name = "device_id", nullable = false)
    private Long deviceId;

    @Column(name = "ssid", length = 255)
    private String ssid;

    @Column(name = "ip_address", columnDefinition = "inet")
    private String ipAddress;

    @Column(name = "mac_address", columnDefinition = "macaddr")
    private String macAddress;

    @Type(type = "jsonb")
    @Column(name = "access_info", columnDefinition = "jsonb")
    private String accessInfo; // Password (encrypted)

    @Column(name = "last_seen")
    private Instant lastSeen = Instant.now();
}
