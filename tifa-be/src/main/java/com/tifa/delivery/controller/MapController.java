package com.tifa.delivery.controller;

import com.tifa.delivery.service.MapDownloadService;
import com.tifa.delivery.service.MapUploadService;
import com.tifa.delivery.service.MapZipService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Map Controller
 * Handles map upload, download, listing, and detail endpoints.
 */
@RestController
@RequestMapping("/api/maps")
@RequiredArgsConstructor
@Slf4j
public class MapController {

    private final MapUploadService mapUploadService;
    private final MapDownloadService mapDownloadService;
    private final MapZipService mapZipService;
    private final JdbcTemplate jdbcTemplate;

    // ─────────────────────────────────────────────────────────────────────────
    // EXISTING ENDPOINTS (unchanged)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/maps/upload
     * Upload map with PGM and YAML files
     */
    @PostMapping("/upload")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadMap(
            @RequestParam("mapName") String mapName,
            @RequestParam("pgmFile") MultipartFile pgmFile,
            @RequestParam("yamlFile") MultipartFile yamlFile,
            @RequestParam(value = "uploadedBy", required = false, defaultValue = "1") Long uploadedBy) {

        log.info("Map upload: mapName={}, pgmSize={}, yamlSize={}",
                mapName, pgmFile.getSize(), yamlFile.getSize());
        try {
            if (pgmFile.isEmpty() || yamlFile.isEmpty()) {
                return badRequest("PGM and YAML files are required");
            }
            return ResponseEntity.ok(mapUploadService.uploadMap(mapName, pgmFile, yamlFile, uploadedBy));
        } catch (Exception e) {
            log.error("Map upload failed: {}", e.getMessage(), e);
            return serverError("Map upload failed: " + e.getMessage());
        }
    }

    /**
     * POST /api/maps/upload/full
     * Upload map with PGM, YAML, Categories, and Destinations
     */
    @PostMapping("/upload/full")
    // @PreAuthorize removed: robot is frozen (no JWT) — endpoint is permitAll-ed in SecurityConfig. RESTORE when robot sends token.
    public ResponseEntity<Map<String, Object>> uploadFullMap(
            @RequestParam("mapName") String mapName,
            @RequestParam("pgmFile") MultipartFile pgmFile,
            @RequestParam("yamlFile") MultipartFile yamlFile,
            @RequestParam(value = "categories", required = false) String categoriesJson,
            @RequestParam(value = "destinations", required = false) String destinationsJson,
            @RequestParam(value = "uploadedBy", required = false, defaultValue = "1") Long uploadedBy) {

        log.info("Full map upload: mapName={}, pgmSize={}, yamlSize={}, hasCategories={}, hasDestinations={}",
                mapName, pgmFile.getSize(), yamlFile.getSize(), categoriesJson != null, destinationsJson != null);
        try {
            if (pgmFile.isEmpty() || yamlFile.isEmpty()) {
                return badRequest("PGM and YAML files are required");
            }
            Map<String, Object> response = mapUploadService.uploadMap(mapName, pgmFile, yamlFile, uploadedBy);
            
            // If upload successful and JSON data provided, invoke service to save categories/destinations
            if ((Boolean) response.get("success")) {
                Long mapId = (Long) response.get("mapId");
                mapUploadService.saveMapMetadata(mapId, categoriesJson, destinationsJson);
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Full Map upload failed: {}", e.getMessage(), e);
            return serverError("Full Map upload failed: " + e.getMessage());
        }
    }

    /**
     * GET /api/maps/{mapName}/download
     * Get map file URLs and metadata (used by DM command)
     */
    @GetMapping("/{mapName}/download")
    public ResponseEntity<Map<String, Object>> downloadMap(@PathVariable String mapName) {
        log.info("Map download info: mapName={}", mapName);
        try {
            return ResponseEntity.ok(mapDownloadService.getMapDownloadInfo(mapName));
        } catch (Exception e) {
            log.error("Map download info failed: {}", e.getMessage(), e);
            return ResponseEntity.status(404).body(error("Map not found: " + mapName));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NEW ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/maps
     * List all available maps with basic metadata.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listMaps() {
        try {
            List<Map<String, Object>> maps = jdbcTemplate.queryForList(
                    "SELECT m.map_id, m.map_name, m.description, m.is_active, m.created_at, " +
                            "       (SELECT COUNT(*) FROM m_goal g WHERE g.map_id = m.map_id) AS destination_count, " +
                            "       mv.version_number AS latest_version " +
                            "FROM m_map m " +
                            "LEFT JOIN LATERAL (" +
                            "  SELECT version_number FROM m_map_version WHERE map_id = m.map_id " +
                            "  ORDER BY version_number DESC LIMIT 1" +
                            ") mv ON true " +
                            "ORDER BY m.map_name");
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("maps", maps);
            response.put("total", maps.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("List maps failed: {}", e.getMessage(), e);
            return serverError("Failed to list maps: " + e.getMessage());
        }
    }

    /**
     * GET /api/maps/{mapId}/details
     * Get map with all destinations (goals) and categories.
     * Used by tifa-app to repopulate IndexedDB after a MAP_SELECTED.
     */
    @GetMapping("/{mapId}/details")
    public ResponseEntity<Map<String, Object>> getMapDetails(@PathVariable Integer mapId) {
        try {
            // Map info
            Map<String, Object> mapInfo = jdbcTemplate.queryForMap(
                    "SELECT map_id, map_name, description, is_active, created_at FROM m_map WHERE map_id = ?",
                    mapId);

            // Destinations (goals)
            List<Map<String, Object>> destinations = jdbcTemplate.queryForList(
                    "SELECT g.goal_id, g.goal_code, g.goal_name, g.goal_type, " +
                            "       g.x, g.y, g.yaw, g.category_id, g.zone, g.metadata " +
                            "FROM m_goal g WHERE g.map_id = ? ORDER BY g.goal_name",
                    mapId);

            // Categories
            List<Map<String, Object>> categories = jdbcTemplate.queryForList(
                    "SELECT gc.category_id, gc.category_name, gc.category_type, gc.color, gc.sort_order " +
                            "FROM m_goal_category gc " +
                            "WHERE gc.category_id IN (" +
                            "  SELECT DISTINCT category_id FROM m_goal WHERE map_id = ? AND category_id IS NOT NULL" +
                            ")",
                    mapId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("map", mapInfo);
            response.put("destinations", destinations);
            response.put("categories", categories);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Map details failed for mapId={}: {}", mapId, e.getMessage(), e);
            return ResponseEntity.status(404).body(error("Map not found: " + mapId));
        }
    }

    /**
     * GET /api/maps/{mapId}/download/zip
     * Download a ZIP of all map files (PGM, YAML) for a given map ID.
     * Used by tifa-app to push map files to the robot via ADB.
     */
    @GetMapping("/{mapId}/download/zip")
    public ResponseEntity<byte[]> downloadMapZip(@PathVariable Integer mapId) {
        log.info("Map ZIP download: mapId={}", mapId);
        try {
            byte[] zipBytes = mapZipService.buildZip(mapId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "map_" + mapId + ".zip");
            headers.setContentLength(zipBytes.length);

            return ResponseEntity.ok().headers(headers).body(zipBytes);
        } catch (Exception e) {
            log.error("Map ZIP download failed for mapId={}: {}", mapId, e.getMessage(), e);
            return ResponseEntity.status(404).build();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private ResponseEntity<Map<String, Object>> badRequest(String message) {
        return ResponseEntity.badRequest().body(error(message));
    }

    private ResponseEntity<Map<String, Object>> serverError(String message) {
        return ResponseEntity.status(500).body(error(message));
    }

    private Map<String, Object> error(String message) {
        Map<String, Object> err = new HashMap<>();
        err.put("success", false);
        err.put("message", message);
        return err;
    }
}
