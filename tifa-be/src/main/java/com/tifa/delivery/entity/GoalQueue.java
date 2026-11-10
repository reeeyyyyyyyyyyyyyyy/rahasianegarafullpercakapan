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
 * Goal Queue entity (t_goal_queue)
 */
@Entity
@Table(name = "t_goal_queue")
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GoalQueue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "goal_queue_id")
    private Long goalQueueId;

    @Column(name = "queue_code", length = 128, unique = true)
    private String queueCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "map_id")
    private Map map;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    private Device device;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by")
    private User requestedBy;

    @Column(name = "priority")
    private Integer priority = 100;

    @Column(name = "retry_count")
    private Integer retryCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", columnDefinition = "goal_queue_status_t")
    private GoalQueueStatus status = GoalQueueStatus.QUEUED;

    @Column(name = "fail_reason", columnDefinition = "TEXT")
    private String failReason;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Type(type = "jsonb")
    @Column(name = "payload", columnDefinition = "jsonb")
    private String payload;

    public enum GoalQueueStatus {
        QUEUED, IN_PROGRESS, DONE, FAILED, CANCELLED
    }
}
