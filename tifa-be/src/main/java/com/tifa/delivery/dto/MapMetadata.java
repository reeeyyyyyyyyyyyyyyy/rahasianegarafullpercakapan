package com.tifa.delivery.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Map metadata parsed from YAML file
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MapMetadata {
    private String image;
    private Double resolution;
    private Double[] origin; // [x, y, theta]
    private Integer negate;
    private Double occupiedThresh;
    private Double freeThresh;
    
    // Additional metadata
    private Integer width;
    private Integer height;
}
