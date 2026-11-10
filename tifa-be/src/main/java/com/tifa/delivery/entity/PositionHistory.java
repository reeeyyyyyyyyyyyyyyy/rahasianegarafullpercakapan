package com.tifa.delivery.entity;

import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

import javax.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "h_position")
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
public class PositionHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "h_position_id")
    private Long positionId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;
    
    @Column(name = "x", nullable = false)
    private Double x;
    
    @Column(name = "y", nullable = false)
    private Double y;
    
    @Column(name = "yaw")
    private Double yaw;
    
    @CreationTimestamp
    @Column(name = "recorded_at")
    private OffsetDateTime recordedAt;
    
    @Type(type = "jsonb")
    @Column(name = "raw_payload", columnDefinition = "jsonb")
    private String rawPayload;
    
    // Constructors
    public PositionHistory() {}
    
    public PositionHistory(Device device, Double x, Double y, Double yaw) {
        this.device = device;
        this.x = x;
        this.y = y;
        this.yaw = yaw;
    }
    
    // Getters and Setters
    public Long getPositionId() {
        return positionId;
    }
    
    public void setPositionId(Long positionId) {
        this.positionId = positionId;
    }
    
    public Device getDevice() {
        return device;
    }
    
    public void setDevice(Device device) {
        this.device = device;
    }
    
    public Double getX() {
        return x;
    }
    
    public void setX(Double x) {
        this.x = x;
    }
    
    public Double getY() {
        return y;
    }
    
    public void setY(Double y) {
        this.y = y;
    }
    
    public Double getYaw() {
        return yaw;
    }
    
    public void setYaw(Double yaw) {
        this.yaw = yaw;
    }
    
    public OffsetDateTime getRecordedAt() {
        return recordedAt;
    }
    
    public void setRecordedAt(OffsetDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }
    
    public String getRawPayload() {
        return rawPayload;
    }
    
    public void setRawPayload(String rawPayload) {
        this.rawPayload = rawPayload;
    }
}
