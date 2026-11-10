package com.tifa.delivery.entity;

import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * Goal/Waypoint Entity
 * Represents navigation waypoints/markers on map
 */
@Entity
@Table(name = "m_goal")
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "goal_id")
    private Long goalId;

    @Column(name = "map_id")
    private Long mapId;

    @Column(name = "goal_code", length = 128)
    private String goalCode;

    @Column(name = "goal_name")
    private String goalName;

    @Column(name = "goal_type")
    @Enumerated(EnumType.STRING)
    @Type(type = "com.vladmihalcea.hibernate.type.basic.PostgreSQLEnumType")
    private GoalType goalType;

    @Column(name = "x")
    private Double x;

    @Column(name = "y")
    private Double y;

    @Column(name = "yaw")
    private Double yaw;

    @Column(name = "category_id")
    private Integer categoryId;

    @Column(name = "zone", length = 20)
    private String zone;

    @Type(type = "jsonb")
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Transient fields for response
    @Transient
    private String mapName;

    public enum GoalType {
        TABLE,
        CHARGE,
        HOME,
        CUSTOM
    }
}
