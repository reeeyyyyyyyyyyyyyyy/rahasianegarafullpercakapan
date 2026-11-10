package com.tifa.delivery.kafka;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Message Deduplication Service
 * Ensures exactly-once processing of Kafka messages using t_message_dedupe
 * table.
 *
 * Previously existed but was unused due to @ConditionalOnProperty blocking
 * and UUID signature mismatch. Now simplified to match consumer patterns.
 */
@Service
public class MessageDedupeService {

    private static final Logger logger = LoggerFactory.getLogger(MessageDedupeService.class);
    private final JdbcTemplate jdbcTemplate;

    public MessageDedupeService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Check if message has already been processed.
     *
     * @param messageId the message ID (String, as used throughout consumers)
     * @return true if duplicate
     */
    @Transactional(readOnly = true)
    public boolean isDuplicate(String messageId) {
        if (messageId == null || messageId.isBlank()) {
            return false;
        }
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM t_message_dedupe WHERE message_id = ?",
                    Integer.class,
                    messageId);
            return count != null && count > 0;
        } catch (Exception e) {
            logger.error("[Dedupe] Error checking duplicate for messageId={}: {}", messageId, e.getMessage());
            return false;
        }
    }

    /**
     * Mark message as processed.
     *
     * @param messageId the message ID
     */
    @Transactional
    public void markProcessed(String messageId) {
        if (messageId == null || messageId.isBlank()) {
            return;
        }
        try {
            jdbcTemplate.update(
                    "INSERT INTO t_message_dedupe (message_id, processed_at) VALUES (?, NOW())",
                    messageId);
        } catch (Exception e) {
            logger.error("[Dedupe] Error marking processed for messageId={}: {}", messageId, e.getMessage());
        }
    }

    /**
     * Cleanup old dedupe records.
     *
     * @param daysToKeep number of days to retain
     * @return number of deleted rows
     */
    @Transactional
    public int cleanupOldRecords(int daysToKeep) {
        try {
            String sql = "DELETE FROM t_message_dedupe WHERE processed_at < NOW() - INTERVAL '" + daysToKeep + " days'";
            int deleted = jdbcTemplate.update(sql);
            logger.info("[Dedupe] Cleanup: deleted {} old records (older than {} days)", deleted, daysToKeep);
            return deleted;
        } catch (Exception e) {
            logger.error("[Dedupe] Error during cleanup: {}", e.getMessage());
            return 0;
        }
    }
}
