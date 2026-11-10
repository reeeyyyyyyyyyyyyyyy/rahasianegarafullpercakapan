package com.tifa.delivery.entity;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;

import javax.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "h_connection_log")
public class ConnectionLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "h_connection_log_id")
    private Long connectionLogId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    private Device device;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "connection_type", columnDefinition = "connection_type_t")
    private ConnectionType connectionType;
    
    @Column(name = "event_type", length = 64)
    private String eventType;
    
    @Column(name = "ip_address")
    private String ipAddress;
    
    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;
    
    @CreationTimestamp
    @Column(name = "recorded_at")
    private OffsetDateTime recordedAt;
    
    // Enum for connection types
    public enum ConnectionType {
        CLOUD_WS,
        ROBOT_LOCAL_WS
    }
    
    // Constructors
    public ConnectionLog() {}
    
    public ConnectionLog(Device device, ConnectionType connectionType, String eventType, String ipAddress) {
        this.device = device;
        this.connectionType = connectionType;
        this.eventType = eventType;
        this.ipAddress = ipAddress;
    }
    
    // Getters and Setters
    public Long getConnectionLogId() {
        return connectionLogId;
    }
    
    public void setConnectionLogId(Long connectionLogId) {
        this.connectionLogId = connectionLogId;
    }
    
    public Device getDevice() {
        return device;
    }
    
    public void setDevice(Device device) {
        this.device = device;
    }
    
    public ConnectionType getConnectionType() {
        return connectionType;
    }
    
    public void setConnectionType(ConnectionType connectionType) {
        this.connectionType = connectionType;
    }
    
    public String getEventType() {
        return eventType;
    }
    
    public void setEventType(String eventType) {
        this.eventType = eventType;
    }
    
    public String getIpAddress() {
        return ipAddress;
    }
    
    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }
    
    public String getUserAgent() {
        return userAgent;
    }
    
    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }
    
    public OffsetDateTime getRecordedAt() {
        return recordedAt;
    }
    
    public void setRecordedAt(OffsetDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }
}
