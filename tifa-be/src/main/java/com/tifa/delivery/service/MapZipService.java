package com.tifa.delivery.service;

import com.tifa.delivery.entity.GFile;
import com.tifa.delivery.entity.MapVersion;
import com.tifa.delivery.repository.GFileRepository;
import com.tifa.delivery.repository.MapVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Map ZIP Service
 * Creates ZIP archives from stored map files (PGM, YAML, and optional extras)
 * for download by the frontend (tifa-app).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MapZipService {

    private final MapVersionRepository mapVersionRepository;
    private final GFileRepository gFileRepository;

    /**
     * Build a ZIP archive from files in the latest map version.
     *
     * @param mapId map ID
     * @return byte array of the ZIP content
     * @throws IOException if files cannot be read
     */
    public byte[] buildZip(Integer mapId) throws IOException {
        // Resolve latest version
        MapVersion latestVersion = mapVersionRepository.findFirstByMapIdOrderByVersionNumberDesc(mapId.longValue())
                .orElseThrow(() -> new RuntimeException("No version found for map: " + mapId));

        // Get all files in this group
        List<GFile> files = gFileRepository.findByFileGroupId(latestVersion.getGfileGroupId());

        if (files.isEmpty()) {
            throw new RuntimeException("No files found for map " + mapId);
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (GFile file : files) {
                Path filePath = Paths.get(file.getFilePath());
                if (!Files.exists(filePath)) {
                    log.warn("[MapZipService] File not found on disk, skipping: {}", filePath);
                    continue;
                }
                String entryName = filePath.getFileName().toString();
                zos.putNextEntry(new ZipEntry(entryName));
                Files.copy(filePath, zos);
                zos.closeEntry();
                log.debug("[MapZipService] Added to ZIP: {} ({}B)", entryName, Files.size(filePath));
            }
        }

        log.info("[MapZipService] Created ZIP for mapId={}: {} bytes", mapId, baos.size());
        return baos.toByteArray();
    }
}
