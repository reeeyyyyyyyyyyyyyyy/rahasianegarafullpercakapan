package com.tifa.delivery.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * File Storage Service for v3
 * Handles local filesystem storage for maps
 * 
 * Directory structure:
 * /data/maps/{map_id}/{version}/
 *   - map.pgm
 *   - map.yaml
 *   - metadata.json
 *   - preview.png (optional)
 */
@Service
@Slf4j
public class FileStorageService {

    @Value("${file.upload.dir}")
    private String uploadDir;

    /**
     * Store map files to local filesystem
     * 
     * @param mapId Map ID
     * @param version Version number
     * @param pgmFile PGM file
     * @param yamlFile YAML file
     * @return Base directory path
     */
    public String storeMapFiles(Long mapId, Integer version, 
                                 MultipartFile pgmFile, MultipartFile yamlFile) {
        
        log.info("Storing map files: mapId={}, version={}", mapId, version);

        try {
            // Create directory: /data/maps/{map_id}/{version}/
            String basePath = String.format("%s/%d/%d", uploadDir, mapId, version);
            Path baseDir = Paths.get(basePath);
            Files.createDirectories(baseDir);

            // Store PGM file
            if (pgmFile != null && !pgmFile.isEmpty()) {
                String pgmFileName = "map.pgm";
                Path pgmPath = baseDir.resolve(pgmFileName);
                Files.copy(pgmFile.getInputStream(), pgmPath, StandardCopyOption.REPLACE_EXISTING);
                log.info("Stored PGM: {}", pgmPath);
            }

            // Store YAML file
            if (yamlFile != null && !yamlFile.isEmpty()) {
                String yamlFileName = "map.yaml";
                Path yamlPath = baseDir.resolve(yamlFileName);
                Files.copy(yamlFile.getInputStream(), yamlPath, StandardCopyOption.REPLACE_EXISTING);
                log.info("Stored YAML: {}", yamlPath);
            }

            log.info("Map files stored successfully: {}", basePath);
            return basePath;

        } catch (IOException e) {
            log.error("Failed to store map files: {}", e.getMessage(), e);
            throw new RuntimeException("File storage failed: " + e.getMessage());
        }
    }

    /**
     * Get absolute path for map version
     */
    public String getMapPath(Long mapId, Integer version) {
        return String.format("%s/%d/%d", uploadDir, mapId, version);
    }

    /**
     * Check if file exists
     */
    public boolean fileExists(String filePath) {
        return new File(filePath).exists();
    }

    /**
     * Get file size
     */
    public long getFileSize(String filePath) {
        return new File(filePath).length();
    }

    /**
     * Delete map directory
     */
    public void deleteMapDirectory(Long mapId, Integer version) {
        try {
            String basePath = getMapPath(mapId, version);
            Path dir = Paths.get(basePath);
            if (Files.exists(dir)) {
                FileUtils.deleteDirectory(dir.toFile());
                log.info("Deleted map directory: {}", basePath);
            }
        } catch (IOException e) {
            log.error("Failed to delete map directory: {}", e.getMessage(), e);
        }
    }

    /**
     * Get file URL (for download)
     */
    public String getFileUrl(Long mapId, Integer version, String fileName) {
        // In production, this should return HTTP URL (e.g., via CDN or file server)
        // For now, return local path
        return String.format("%s/%d/%d/%s", uploadDir, mapId, version, fileName);
    }
}
