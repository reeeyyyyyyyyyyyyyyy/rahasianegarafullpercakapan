package com.tifa.delivery.service;

import com.tifa.delivery.dto.DeliveryConfirmRequest;
import com.tifa.delivery.dto.DeliveryConfirmResponse;
import com.tifa.delivery.entity.GoalQueue;
import com.tifa.delivery.entity.GoalQueueDetail;
import com.tifa.delivery.repository.GoalQueueDetailRepository;
import com.tifa.delivery.repository.GoalQueueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Delivery Service for v3 Tray Sequential Logic
 * 
 * Flow:
 * 1. User press OK button → UI sends delivery_ok event → WS forwards to Backend
 * 2. Backend marks current tray as DONE
 * 3. Backend finds next tray in queue (status=QUEUED, next sequence_order)
 * 4. Backend returns next tray info to WS
 * 5. WS sends MOVE command for next tray to robot
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DeliveryService {

    private final GoalQueueRepository goalQueueRepository;
    private final GoalQueueDetailRepository goalQueueDetailRepository;

    /**
     * Confirm tray delivery and get next tray
     * 
     * POST /api/delivery/confirm
     */
    @Transactional
    public DeliveryConfirmResponse confirmDelivery(DeliveryConfirmRequest request) {
        log.info("Delivery confirmation: queueId={}, trayNumber={}", 
                 request.getQueueId(), request.getTrayNumber());

        // Find queue
        GoalQueue queue = goalQueueRepository.findById(request.getQueueId())
                .orElseThrow(() -> new RuntimeException("Queue not found: " + request.getQueueId()));

        // Find current tray detail
        List<GoalQueueDetail> details = goalQueueDetailRepository
                .findByGoalQueueIdOrderBySequenceOrderAsc(request.getQueueId());

        GoalQueueDetail currentTray = details.stream()
                .filter(d -> d.getTrayNumber().equals(request.getTrayNumber()) 
                          && d.getStatus() == GoalQueue.GoalQueueStatus.IN_PROGRESS)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Current tray not found or not IN_PROGRESS"));

        // Mark current tray as DONE
        currentTray.setStatus(GoalQueue.GoalQueueStatus.DONE);
        currentTray.setFinishedAt(Instant.now());
        goalQueueDetailRepository.save(currentTray);

        log.info("Tray {} marked as DONE", request.getTrayNumber());

        // Find next tray (QUEUED, next sequence_order)
        Optional<GoalQueueDetail> nextTrayOpt = details.stream()
                .filter(d -> d.getStatus() == GoalQueue.GoalQueueStatus.QUEUED 
                          && d.getSequenceOrder() > currentTray.getSequenceOrder())
                .findFirst();

        if (nextTrayOpt.isEmpty()) {
            // No more trays, mark queue as DONE
            queue.setStatus(GoalQueue.GoalQueueStatus.DONE);
            queue.setFinishedAt(Instant.now());
            goalQueueRepository.save(queue);

            log.info("All trays delivered, queue {} marked as DONE", request.getQueueId());

            return DeliveryConfirmResponse.builder()
                    .success(true)
                    .message("All trays delivered successfully")
                    .nextTray(null)
                    .build();
        }

        // Start next tray
        GoalQueueDetail nextTray = nextTrayOpt.get();
        nextTray.setStatus(GoalQueue.GoalQueueStatus.IN_PROGRESS);
        nextTray.setStartedAt(Instant.now());
        goalQueueDetailRepository.save(nextTray);

        log.info("Next tray {} started: dest=({}, {}, {})", 
                 nextTray.getTrayNumber(), nextTray.getDestX(), 
                 nextTray.getDestY(), nextTray.getDestYaw());

        DeliveryConfirmResponse.NextTrayInfo nextTrayInfo = 
                DeliveryConfirmResponse.NextTrayInfo.builder()
                        .trayNumber(nextTray.getTrayNumber())
                        .destX(nextTray.getDestX())
                        .destY(nextTray.getDestY())
                        .destYaw(nextTray.getDestYaw())
                        .build();

        return DeliveryConfirmResponse.builder()
                .success(true)
                .message("Delivery confirmed, next tray dispatched")
                .nextTray(nextTrayInfo)
                .build();
    }
}
