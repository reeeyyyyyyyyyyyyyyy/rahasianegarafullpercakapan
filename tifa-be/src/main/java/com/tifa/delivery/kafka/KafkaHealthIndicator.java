package com.tifa.delivery.kafka;

import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.DescribeClusterResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Kafka Health Check Indicator
 * Returns UP/DOWN status for Kafka connectivity
 */
@Component("kafka")
@ConditionalOnProperty(name = "kafka.enabled", havingValue = "true", matchIfMissing = false)
public class KafkaHealthIndicator implements HealthIndicator {

    private static final Logger logger = LoggerFactory.getLogger(KafkaHealthIndicator.class);

    @Autowired
    private KafkaAdmin kafkaAdmin;

    @Value("${kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${kafka.enabled}")
    private boolean kafkaEnabled;

    @Override
    public Health health() {
        if (!kafkaEnabled) {
            return Health.up()
                    .withDetail("status", "disabled")
                    .withDetail("message", "Kafka integration is disabled")
                    .build();
        }

        try (AdminClient adminClient = AdminClient.create(kafkaAdmin.getConfigurationProperties())) {
            // Try to describe cluster (connectivity check)
            DescribeClusterResult clusterResult = adminClient.describeCluster();
            String clusterId = clusterResult.clusterId().get(5, TimeUnit.SECONDS);
            int nodeCount = clusterResult.nodes().get(5, TimeUnit.SECONDS).size();

            return Health.up()
                    .withDetail("status", "up")
                    .withDetail("bootstrap_servers", bootstrapServers)
                    .withDetail("cluster_id", clusterId)
                    .withDetail("node_count", nodeCount)
                    .withDetail("enabled", true)
                    .build();

        } catch (Exception e) {
            logger.error("[KafkaHealth] Kafka health check failed: {}", e.getMessage());
            return Health.down()
                    .withDetail("status", "down")
                    .withDetail("bootstrap_servers", bootstrapServers)
                    .withDetail("error", e.getMessage())
                    .withDetail("enabled", true)
                    .build();
        }
    }
}
