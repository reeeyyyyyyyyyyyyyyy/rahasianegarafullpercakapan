package com.tifa.delivery.controller;

import com.tifa.delivery.dto.DeliveryConfirmRequest;
import com.tifa.delivery.dto.DeliveryConfirmResponse;
import com.tifa.delivery.service.DeliveryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Delivery Controller for v3
 * Handles tray delivery confirmation
 */
@RestController
@RequestMapping("/api/delivery")
@RequiredArgsConstructor
@Slf4j
public class DeliveryController {

    private final DeliveryService deliveryService;

    /**
     * POST /api/delivery/confirm
     * Confirm tray delivery → return next tray info
     * Called by WS Cloud Router when UI sends delivery_ok event
     */
    @PostMapping("/confirm")
    public ResponseEntity<DeliveryConfirmResponse> confirmDelivery(
            @RequestBody DeliveryConfirmRequest request) {
        
        log.info("Delivery confirm API called: queueId={}, trayNumber={}", 
                 request.getQueueId(), request.getTrayNumber());

        try {
            DeliveryConfirmResponse response = deliveryService.confirmDelivery(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Delivery confirmation failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(
                DeliveryConfirmResponse.builder()
                    .success(false)
                    .message("Delivery confirmation failed: " + e.getMessage())
                    .build()
            );
        }
    }
}
