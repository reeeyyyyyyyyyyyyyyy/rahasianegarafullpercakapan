package com.tifa.delivery.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Delivery confirmation response DTO (to WS Cloud Router)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryConfirmResponse {
    private boolean success;
    private String message;
    private NextTrayInfo nextTray;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NextTrayInfo {
        private Integer trayNumber;
        private Double destX;
        private Double destY;
        private Double destYaw;
    }
}
