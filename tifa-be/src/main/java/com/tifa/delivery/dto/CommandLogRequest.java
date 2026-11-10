package com.tifa.delivery.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Command log request DTO (from WS Cloud Router)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommandLogRequest {
    private String robotId;      // device_code (e.g. RB1)
    private String commandCode;  // MOVE, MODE, SHB, etc
    private String payload;      // JSON string
    private String uiId;         // UI that sent command
    private String timestamp;
}
