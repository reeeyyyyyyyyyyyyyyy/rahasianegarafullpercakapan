package com.tifa.delivery.controller;

import com.tifa.delivery.service.DataAggregationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Manual trigger for data aggregation testing.
 * Only for development/testing — scheduler handles production.
 */
@RestController
@RequestMapping("/api/admin/aggregation")
@RequiredArgsConstructor
public class AggregationController {

    private final DataAggregationService aggregationService;

    @PostMapping("/run-daily")
    public ResponseEntity<Map<String, Object>> triggerDaily() {
        aggregationService.runDailyAggregation();
        return ResponseEntity.ok(Map.of("success", true, "message", "Daily aggregation triggered"));
    }

    @PostMapping("/run-last-7-days")
    public ResponseEntity<Map<String, Object>> triggerLast7Days() {
        int rows = aggregationService.aggregateLast7Days();
        return ResponseEntity.ok(Map.of("success", true, "rows", rows));
    }

    @PostMapping("/purge")
    public ResponseEntity<Map<String, Object>> triggerPurge() {
        int purged = aggregationService.purgeRawData();
        return ResponseEntity.ok(Map.of("success", true, "purged", purged));
    }
}
