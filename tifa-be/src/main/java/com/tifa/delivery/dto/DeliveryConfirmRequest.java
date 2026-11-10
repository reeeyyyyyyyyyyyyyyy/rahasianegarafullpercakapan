package com.tifa.delivery.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Delivery confirmation request DTO (from WS Cloud Router)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryConfirmRequest {
    private String robotId;
    private Long queueId;
    private Integer trayNumber;
    private String timestamp;
}
