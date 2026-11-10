package com.tifa.delivery.controller;

import com.tifa.delivery.dto.*;
import com.tifa.delivery.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Authentication Controller for v3
 * Handles JWT login and validation
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    /**
     * POST /auth/login
     * User login → generate JWT token
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        log.info("Login request: username={}", request.getUsername());
        
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Login failed: {}", e.getMessage());
            return ResponseEntity.status(401).build();
        }
    }

    /**
     * POST /auth/register
     * Register new user (for robot service account)
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String password = request.get("password");
            String email = request.getOrDefault("email", username + "@tifa.local");
            String displayName = request.getOrDefault("display_name", username);

            if (username == null || password == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "username and password required"));
            }

            String result = authService.registerUser(username, password, email, displayName);
            return ResponseEntity.ok(Map.of("message", result));
        } catch (Exception e) {
            log.error("Registration failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /auth/validate
     * Validate JWT token (called by WS Cloud Router during UI SI)
     */
    @PostMapping("/validate")
    public ResponseEntity<TokenValidationResponse> validate(@RequestBody TokenValidationRequest request) {
        log.debug("Token validation request received");
        
        TokenValidationResponse response = authService.validateToken(request);
        return ResponseEntity.ok(response);
    }
}
