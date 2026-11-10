package com.tifa.delivery.entity;

import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

import javax.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "h_state")
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
public class StateHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "h_state_id")
    private Long stateId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "robot_mode", columnDefinition = "robot_mode_t")
    private RobotMode robotMode;
    
    @Column(name = "robot_activity")
    private String robotActivity;
    
    @Column(name = "is_emergency")
    private Boolean isEmergency = false;
    
    @CreationTimestamp
    @Column(name = "recorded_at")
    private OffsetDateTime recordedAt;
    
    @Type(type = "jsonb")
    @Column(name = "raw_payload", columnDefinition = "jsonb")
    private String rawPayload;
    
    // Enum for robot modes
    public enum RobotMode {
        IDLE,
        MOVING,
        CHARGING,
        MAPPING,
        RETURNING_HOME,
        ERROR,
        PAUSED
    }
    
    // Constructors
    public StateHistory() {}
    
    public StateHistory(Device device, RobotMode robotMode, String robotActivity) {
        this.device = device;
        this.robotMode = robotMode;
        this.robotActivity = robotActivity;
    }
    
    // Getters and Setters
    public Long getStateId() {
        return stateId;
    }
    
    public void setStateId(Long stateId) {
        this.stateId = stateId;
    }
    
    public Device getDevice() {
        return device;
    }
    
    public void setDevice(Device device) {
        this.device = device;
    }
    
    public RobotMode getRobotMode() {
        return robotMode;
    }
    
    public void setRobotMode(RobotMode robotMode) {
        this.robotMode = robotMode;
    }
    
    public String getRobotActivity() {
        return robotActivity;
    }
    
    public void setRobotActivity(String robotActivity) {
        this.robotActivity = robotActivity;
    }
    
    public Boolean getIsEmergency() {
        return isEmergency;
    }
    
    public void setIsEmergency(Boolean isEmergency) {
        this.isEmergency = isEmergency;
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
