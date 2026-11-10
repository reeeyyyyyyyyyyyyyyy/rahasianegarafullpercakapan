package com.tifa.delivery;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Tifa Robot Delivery Platform v3 - Backend REST API
 * 
 * Architecture: WebSocket-Only (NO Kafka)
 * - REST API for JWT auth, map upload, delivery confirmation
 * - WS Cloud Router handles real-time UI ↔ Robot communication
 * - Multi-UI free control with 4-stage ACK flow
 * - Tray-based sequential delivery with manual OK button
 * 
 * @version 3.0.0
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
public class TifaDeliveryBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TifaDeliveryBackendApplication.class, args);
        System.out.println("========================================");
        System.out.println("✅ Tifa Robot Delivery Backend v3 Started!");
        System.out.println("📡 REST API: http://localhost:8080");
        System.out.println("🔒 JWT Authentication Enabled");
        System.out.println("🗺️ Map Storage: D:/data/maps");
        System.out.println("🤖 WebSocket Router: http://localhost:3001");
        System.out.println("========================================");
    }
}
