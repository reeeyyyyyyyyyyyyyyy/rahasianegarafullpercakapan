package com.tifa.delivery.service;

import com.tifa.delivery.dto.CommandLogRequest;
import com.tifa.delivery.entity.CommandLog;
import com.tifa.delivery.entity.Device;
import com.tifa.delivery.repository.CommandLogRepository;
import com.tifa.delivery.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Command Log Service for v3
 * Replaces Kafka h_command_log topic with REST API
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CommandLogService {

    private final CommandLogRepository commandLogRepository;
    private final DeviceRepository deviceRepository;

    /**
     * Log command (called by WS Cloud Router)
     * 
     * POST /api/ws/log-command
     */
    public void logCommand(CommandLogRequest request) {
        log.info("Logging command: robotId={}, commandCode={}", 
                 request.getRobotId(), request.getCommandCode());

        try {
            // Find device by code
            Device device = deviceRepository.findByDeviceCode(request.getRobotId())
                    .orElse(null);

            CommandLog commandLog = new CommandLog();
            commandLog.setDeviceId(device != null ? device.getDeviceId() : null);
            commandLog.setCommandCode(request.getCommandCode());
            commandLog.setCommandPayload(request.getPayload());
            commandLog.setStatus("SENT");
            commandLog.setStatusMessage(String.format("Command sent by UI: %s", request.getUiId()));

            commandLogRepository.save(commandLog);

            log.info("Command logged: commandLogId={}", commandLog.getCommandLogId());

        } catch (Exception e) {
            log.error("Failed to log command: {}", e.getMessage(), e);
            // Don't throw exception, just log error
        }
    }
}
