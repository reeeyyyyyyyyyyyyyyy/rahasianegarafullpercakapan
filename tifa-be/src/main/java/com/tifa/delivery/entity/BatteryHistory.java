package com.tifa.delivery.entity;

import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "h_battery")
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
public class BatteryHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "h_battery_id")
    private Long batteryId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;
    
    @Column(name = "battery_percent", precision = 5, scale = 2)
    private BigDecimal batteryPercent;
    
    @Column(name = "voltage", precision = 8, scale = 3)
    private BigDecimal voltage;
    
    @CreationTimestamp
    @Column(name = "recorded_at")
    private OffsetDateTime recordedAt;
    
    @Type(type = "jsonb")
    @Column(name = "raw_payload", columnDefinition = "jsonb")
    private String rawPayload;
    
    // Constructors
    public BatteryHistory() {}
    
    public BatteryHistory(Device device, BigDecimal batteryPercent, BigDecimal voltage) {
        this.device = device;
        this.batteryPercent = batteryPercent;
        this.voltage = voltage;
    }
    
    // Getters and Setters
    public Long getBatteryId() {
        return batteryId;
    }
    
    public void setBatteryId(Long batteryId) {
        this.batteryId = batteryId;
    }
    
    public Device getDevice() {
        return device;
    }
    
    public void setDevice(Device device) {
        this.device = device;
    }
    
    public BigDecimal getBatteryPercent() {
        return batteryPercent;
    }
    
    public void setBatteryPercent(BigDecimal batteryPercent) {
        this.batteryPercent = batteryPercent;
    }
    
    public BigDecimal getVoltage() {
        return voltage;
    }
    
    public void setVoltage(BigDecimal voltage) {
        this.voltage = voltage;
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
