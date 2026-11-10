package com.tifa.delivery.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tifa.delivery.dto.MapMetadata;
import com.tifa.delivery.entity.*;
import com.tifa.delivery.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Map Upload Service for v3
 * Handles map upload with YAML parsing and file storage
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MapUploadService {

    private final MapRepository mapRepository;
    private final MapVersionRepository mapVersionRepository;
    private final FileGroupRepository fileGroupRepository;
    private final GFileRepository gFileRepository;
    private final FileStorageService fileStorageService;
    private final YamlParserService yamlParserService;
    private final ObjectMapper objectMapper;
    private final GoalRepository goalRepository;
    private final GoalCategoryRepository goalCategoryRepository;

    /**
     * Upload map with PGM and YAML files
     * 
     * POST /api/maps/upload
     * 
     * @param mapName Map name
     * @param pgmFile PGM image file
     * @param yamlFile YAML metadata file
     * @param uploadedBy User ID
     * @return Upload response with map ID and version
     */
    @Transactional
    public Map<String, Object> uploadMap(String mapName, MultipartFile pgmFile, 
                                          MultipartFile yamlFile, Long uploadedBy) {
        
        log.info("Uploading map: mapName={}, uploadedBy={}", mapName, uploadedBy);

        // 1. Find or create map
        Optional<com.tifa.delivery.entity.Map> existingMap = mapRepository.findByMapName(mapName);
        com.tifa.delivery.entity.Map map;
        Integer versionNumber;

        if (existingMap.isPresent()) {
            map = existingMap.get();
            versionNumber = mapVersionRepository.getMaxVersionNumber(map.getMapId()) + 1;
            log.info("Map exists, creating new version: {}", versionNumber);
        } else {
            map = new com.tifa.delivery.entity.Map();
            map.setMapName(mapName);
            map.setCreatedBy(uploadedBy);
            map = mapRepository.save(map);
            versionNumber = 1;
            log.info("New map created: mapId={}", map.getMapId());
        }

        // 2. Create file group
        FileGroup fileGroup = new FileGroup();
        fileGroup.setGroupName(String.format("%s_v%d", mapName, versionNumber));
        fileGroup = fileGroupRepository.save(fileGroup);
        log.info("File group created: groupId={}", fileGroup.getFileGroupId());

        // 3. Store files to local filesystem
        String basePath = fileStorageService.storeMapFiles(
                map.getMapId(), versionNumber, pgmFile, yamlFile);

        // 4. Parse YAML metadata
        String yamlPath = String.format("%s/map.yaml", basePath);
        MapMetadata metadata = yamlParserService.parseMapYaml(yamlPath);

        // 5. Save PGM file record
        GFile pgmFileRecord = new GFile();
        pgmFileRecord.setFileGroupId(fileGroup.getFileGroupId());
        pgmFileRecord.setFileName(pgmFile.getOriginalFilename());
        pgmFileRecord.setFilePath(String.format("%s/map.pgm", basePath));
        pgmFileRecord.setFileType("pgm");
        pgmFileRecord.setFileSize(pgmFile.getSize());
        pgmFileRecord.setUploadedBy(uploadedBy);
        gFileRepository.save(pgmFileRecord);

        // 6. Save YAML file record
        GFile yamlFileRecord = new GFile();
        yamlFileRecord.setFileGroupId(fileGroup.getFileGroupId());
        yamlFileRecord.setFileName(yamlFile.getOriginalFilename());
        yamlFileRecord.setFilePath(String.format("%s/map.yaml", basePath));
        yamlFileRecord.setFileType("yaml");
        yamlFileRecord.setFileSize(yamlFile.getSize());
        
        // Store metadata as JSON in g_file.metadata
        try {
            String metadataJson = objectMapper.writeValueAsString(metadata);
            yamlFileRecord.setMetadata(metadataJson);
        } catch (Exception e) {
            log.error("Failed to serialize metadata: {}", e.getMessage());
        }
        
        yamlFileRecord.setUploadedBy(uploadedBy);
        gFileRepository.save(yamlFileRecord);

        // 7. Create map version
        MapVersion mapVersion = new MapVersion();
        mapVersion.setMapId(map.getMapId());
        mapVersion.setVersionNumber(versionNumber);
        mapVersion.setGfileGroupId(fileGroup.getFileGroupId());
        mapVersion.setCreatedBy(uploadedBy);
        mapVersion.setChangelog(String.format("Uploaded PGM: %s, YAML: %s", 
                pgmFile.getOriginalFilename(), yamlFile.getOriginalFilename()));
        mapVersionRepository.save(mapVersion);

        // 8. Update map file_group_id to latest
        map.setFileGroupId(fileGroup.getFileGroupId());
        mapRepository.save(map);

        log.info("Map upload completed: mapId={}, version={}", map.getMapId(), versionNumber);

        // 9. Return response
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Map uploaded successfully");
        response.put("mapId", map.getMapId());
        response.put("mapName", map.getMapName());
        response.put("version", versionNumber);
        response.put("fileGroupId", fileGroup.getFileGroupId());
        response.put("basePath", basePath);
        response.put("metadata", metadata);

        return response;
    }

    /**
     * Save categories and destinations for a map
     */
    @Transactional
    public void saveMapMetadata(Long mapId, String categoriesJson, String destinationsJson) {
        log.info("Saving map metadata for mapId: {}", mapId);
        
        try {
            // Mapping original indexedDB category_id to generated Db category_id
            Map<Integer, Long> categoryIdMap = new HashMap<>();

            // 1. Process Categories
            if (categoriesJson != null && !categoriesJson.isEmpty()) {
                com.fasterxml.jackson.core.type.TypeReference<java.util.List<Map<String, Object>>> typeRef =
                        new com.fasterxml.jackson.core.type.TypeReference<>() {};
                java.util.List<Map<String, Object>> categoriesList = objectMapper.readValue(categoriesJson, typeRef);

                for (Map<String, Object> catMap : categoriesList) {
                    GoalCategory category = new GoalCategory();
                    category.setCategoryName((String) catMap.get("category_name"));
                    category.setCategoryType((String) catMap.get("category_type"));
                    
                    if (catMap.containsKey("color")) {
                        category.setColor((String) catMap.get("color"));
                    }
                    if (catMap.containsKey("sort_order")) {
                        category.setSortOrder(((Number) catMap.get("sort_order")).intValue());
                    }
                    if (catMap.containsKey("is_active")) {
                        category.setIsActive(((Number) catMap.get("is_active")).intValue());
                    }

                    category = goalCategoryRepository.save(category);
                    
                    // Map indexedDB category_id to PostGres category_id
                    if (catMap.containsKey("category_id")) {
                        categoryIdMap.put(((Number) catMap.get("category_id")).intValue(), category.getCategoryId());
                    }
                }
            }

            // 2. Process Destinations (Goals)
            if (destinationsJson != null && !destinationsJson.isEmpty()) {
                com.fasterxml.jackson.core.type.TypeReference<java.util.List<Map<String, Object>>> destTypeRef =
                        new com.fasterxml.jackson.core.type.TypeReference<>() {};
                java.util.List<Map<String, Object>> destinationsList = objectMapper.readValue(destinationsJson, destTypeRef);

                // Clear existing goals for this map (full replace)
                // In production, you might want to mark them as inactive or merge.
                java.util.List<Goal> existingGoals = goalRepository.findByMapId(mapId);
                goalRepository.deleteAll(existingGoals);

                for (Map<String, Object> destMap : destinationsList) {
                    Goal goal = new Goal();
                    goal.setMapId(mapId);
                    goal.setGoalCode((String) destMap.get("destination_code"));
                    goal.setGoalName((String) destMap.get("destination_name"));
                    
                    // Default to CUSTOM if not specified
                    Goal.GoalType goalType = Goal.GoalType.CUSTOM;
                    if (destMap.containsKey("is_home") && ((Number) destMap.get("is_home")).intValue() == 1) {
                         goalType = Goal.GoalType.HOME;
                    } else if (destMap.containsKey("destination_code") && 
                              "CHARGE".equalsIgnoreCase((String) destMap.get("destination_code"))) {
                         goalType = Goal.GoalType.CHARGE;
                    }
                    goal.setGoalType(goalType);

                    if (destMap.containsKey("x")) goal.setX(((Number) destMap.get("x")).doubleValue());
                    if (destMap.containsKey("y")) goal.setY(((Number) destMap.get("y")).doubleValue());
                    if (destMap.containsKey("yaw")) goal.setYaw(((Number) destMap.get("yaw")).doubleValue());
                    if (destMap.containsKey("zone")) goal.setZone((String) destMap.get("zone"));

                    // Map category_id
                    if (destMap.containsKey("category_id") && destMap.get("category_id") != null) {
                        Integer oldId = ((Number) destMap.get("category_id")).intValue();
                        Long newId = categoryIdMap.get(oldId);
                        goal.setCategoryId(newId == null ? null : newId.intValue());
                    }

                    goalRepository.save(goal);
                }
            }

        } catch (Exception e) {
            log.error("Failed to save map metadata: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to save map metadata", e);
        }
    }
}
