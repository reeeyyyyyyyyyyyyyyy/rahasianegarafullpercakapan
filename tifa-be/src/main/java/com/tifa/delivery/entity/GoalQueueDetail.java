package com.tifa.delivery.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.Instant;

/**
 * Goal Queue Detail entity (t_goal_queue_detail)
 * For tray-based sequential delivery
 */
@Entity
@Table(name = "t_goal_queue_detail")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GoalQueueDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "goal_queue_detail_id")
    private Long goalQueueDetailId;

    @Column(name = "goal_queue_id", nullable = false)
    private Long goalQueueId;

    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder = 1;

    @Column(name = "goal_id")
    private Long goalId;

    @Column(name = "dest_x")
    private Double destX;

    @Column(name = "dest_y")
    private Double destY;

    @Column(name = "dest_yaw")
    private Double destYaw;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", columnDefinition = "goal_queue_status_t")
    private GoalQueue.GoalQueueStatus status = GoalQueue.GoalQueueStatus.QUEUED;

    @Column(name = "fail_reason", columnDefinition = "TEXT")
    private String failReason;

    @Column(name = "attempt_count")
    private Integer attemptCount = 0;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    // NEW for v3: Tray number
    @Column(name = "tray_number")
    private Integer trayNumber;
}
