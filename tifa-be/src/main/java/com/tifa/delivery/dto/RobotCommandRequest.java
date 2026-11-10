package com.tifa.delivery.dto;

import lombok.Data;

/**
 * DTO for robot command requests from Dashboard/UI
 */
@Data
public class RobotCommandRequest {
    private String deviceCode;
    private Double goalX;
    private Double goalY;
    private Double goalYaw;
    private String goalType; // DELIVERY, WAYPOINT, CHARGING
}
