package com.tifa.delivery.entity;

import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

import javax.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "h_expression")
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
public class Expression {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "h_expression_id")
    private Long expressionId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;
    
    @Column(name = "expression_type", length = 64)
    private String expressionType;
    
    @Column(name = "led_pattern")
    private String ledPattern;
    
    @Column(name = "sound_file")
    private String soundFile;
    
    @CreationTimestamp
    @Column(name = "recorded_at")
    private OffsetDateTime recordedAt;
    
    @Type(type = "jsonb")
    @Column(name = "raw_payload", columnDefinition = "jsonb")
    private String rawPayload;
    
    // Constructors
    public Expression() {}
    
    public Expression(Device device, String expressionType, String ledPattern, String soundFile) {
        this.device = device;
        this.expressionType = expressionType;
        this.ledPattern = ledPattern;
        this.soundFile = soundFile;
    }
    
    // Getters and Setters
    public Long getExpressionId() {
        return expressionId;
    }
    
    public void setExpressionId(Long expressionId) {
        this.expressionId = expressionId;
    }
    
    public Device getDevice() {
        return device;
    }
    
    public void setDevice(Device device) {
        this.device = device;
    }
    
    public String getExpressionType() {
        return expressionType;
    }
    
    public void setExpressionType(String expressionType) {
        this.expressionType = expressionType;
    }
    
    public String getLedPattern() {
        return ledPattern;
    }
    
    public void setLedPattern(String ledPattern) {
        this.ledPattern = ledPattern;
    }
    
    public String getSoundFile() {
        return soundFile;
    }
    
    public void setSoundFile(String soundFile) {
        this.soundFile = soundFile;
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
