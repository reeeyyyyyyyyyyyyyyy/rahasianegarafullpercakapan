package com.tifa.delivery.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Token validation request DTO (from WS Cloud Router)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TokenValidationRequest {
    private String token;
}
