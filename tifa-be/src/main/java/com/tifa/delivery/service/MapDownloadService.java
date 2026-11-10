package com.tifa.delivery.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tifa.delivery.dto.MapMetadata;
import com.tifa.delivery.entity.GFile;
import com.tifa.delivery.entity.MapVersion;
import com.tifa.delivery.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Map Download Service for v3
 * Handles map download requests (called by WS Cloud Router for DM command)
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MapDownloadService {

    private final MapRepository mapRepository;
    private final MapVersionRepository mapVersionRepository;
    private final GFileRepository gFileRepository;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    /**
     * Get map download info
     * 
     * GET /api/maps/{mapName}/download
     * 
     * Returns file URLs and metadata for latest version
     */
    public Map<String, Object> getMapDownloadInfo(String mapName) {
        log.info("Getting map download info: mapName={}", mapName);

        // 1. Find map
        com.tifa.delivery.entity.Map map = mapRepository.findByMapName(mapName)
                .orElseThrow(() -> new RuntimeException("Map not found: " + mapName));

        // 2. Get latest version
        MapVersion latestVersion = mapVersionRepository.findFirstByMapIdOrderByVersionNumberDesc(map.getMapId())
                .orElseThrow(() -> new RuntimeException("No version found for map: " + mapName));

        // 3. Get files for this version
        List<GFile> files = gFileRepository.findByFileGroupId(latestVersion.getGfileGroupId());

        // 4. Build response
        Map<String, Object> response = new HashMap<>();
        response.put("mapId", map.getMapId());
        response.put("mapName", map.getMapName());
        response.put("version", latestVersion.getVersionNumber());
        response.put("description", map.getDescription());

        // Extract file URLs
        for (GFile file : files) {
            if ("pgm".equals(file.getFileType())) {
                response.put("pgmUrl", file.getFilePath());
                response.put("pgmSize", file.getFileSize());
            } else if ("yaml".equals(file.getFileType())) {
                response.put("yamlUrl", file.getFilePath());
                response.put("yamlSize", file.getFileSize());

                // Parse metadata from g_file.metadata
                if (file.getMetadata() != null) {
                    try {
                        MapMetadata metadata = objectMapper.readValue(
                                file.getMetadata(), MapMetadata.class);
                        response.put("metadata", metadata);
                    } catch (Exception e) {
                        log.error("Failed to parse metadata: {}", e.getMessage());
                    }
                }
            }
        }

        log.info("Map download info retrieved: mapId={}, version={}", 
                 map.getMapId(), latestVersion.getVersionNumber());

        return response;
    }
}
