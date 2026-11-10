package com.tifa.delivery.service;

import com.tifa.delivery.dto.MapMetadata;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import java.io.FileInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * YAML Parser Service for map metadata
 * Parses ROS map YAML format
 */
@Service
@Slf4j
public class YamlParserService {

    /**
     * Parse map YAML file
     * 
     * Expected format:
     * image: map.pgm
     * resolution: 0.050000
     * origin: [-10.000000, -10.000000, 0.000000]
     * negate: 0
     * occupied_thresh: 0.65
     * free_thresh: 0.196
     */
    public MapMetadata parseMapYaml(String yamlFilePath) {
        log.info("Parsing YAML file: {}", yamlFilePath);

        try (InputStream inputStream = new FileInputStream(yamlFilePath)) {
            Yaml yaml = new Yaml();
            Map<String, Object> data = yaml.load(inputStream);

            MapMetadata metadata = MapMetadata.builder()
                    .image((String) data.get("image"))
                    .resolution(getDouble(data, "resolution"))
                    .negate(getInteger(data, "negate"))
                    .occupiedThresh(getDouble(data, "occupied_thresh"))
                    .freeThresh(getDouble(data, "free_thresh"))
                    .build();

            // Parse origin array
            if (data.containsKey("origin")) {
                Object originObj = data.get("origin");
                if (originObj instanceof List) {
                    List<?> originList = (List<?>) originObj;
                    Double[] origin = new Double[3];
                    for (int i = 0; i < Math.min(3, originList.size()); i++) {
                        origin[i] = convertToDouble(originList.get(i));
                    }
                    metadata.setOrigin(origin);
                }
            }

            log.info("YAML parsed successfully: resolution={}, origin={}", 
                     metadata.getResolution(), metadata.getOrigin());

            return metadata;

        } catch (Exception e) {
            log.error("Failed to parse YAML: {}", e.getMessage(), e);
            throw new RuntimeException("YAML parsing failed: " + e.getMessage());
        }
    }

    private Double getDouble(Map<String, Object> data, String key) {
        Object value = data.get(key);
        return convertToDouble(value);
    }

    private Integer getInteger(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value == null) return null;
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof Number) return ((Number) value).intValue();
        return Integer.parseInt(value.toString());
    }

    private Double convertToDouble(Object value) {
        if (value == null) return null;
        if (value instanceof Double) return (Double) value;
        if (value instanceof Number) return ((Number) value).doubleValue();
        return Double.parseDouble(value.toString());
    }
}
