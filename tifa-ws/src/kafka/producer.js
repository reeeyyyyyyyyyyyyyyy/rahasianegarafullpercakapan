const { kafka, TOPICS } = require('./config');
const { Partitioners } = require('kafkajs');
const logger = require('../utils/logger');

/**
 * Kafka Producer
 * Produces ALL WS messages to Kafka
 */
class KafkaProducerService {
  constructor() {
    this.producer = kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
      idempotent: true,
      maxInFlightRequests: 5,
      retry: {
        retries: 3,
        initialRetryTime: 100
      }
    });
    this.connected = false;
  }

  /**
   * Connect to Kafka
   */
  async connect() {
    try {
      await this.producer.connect();
      this.connected = true;
      logger.info('[KafkaProducer] ✅ Connected to Kafka brokers');
    } catch (error) {
      logger.error('[KafkaProducer] ❌ Failed to connect:', error.message);
      throw error;
    }
  }

  /**
   * Produce message to topic
   */
  async produce(topic, message, key = null) {
    if (!this.connected) {
      logger.warn('[KafkaProducer] Not connected, skipping message');
      return false;
    }

    try {
      await this.producer.send({
        topic,
        messages: [{
          key: key,
          value: JSON.stringify(message),
          timestamp: Date.now().toString()
        }]
      });
      
      logger.debug(`[KafkaProducer] ✅ Produced to ${topic}:`, message.message_id || 'no-id');
      return true;
    } catch (error) {
      logger.error(`[KafkaProducer] ❌ Failed to produce to ${topic}:`, error.message);
      return false;
    }
  }

  /**
   * Disconnect producer
   */
  async disconnect() {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
      logger.info('[KafkaProducer] Disconnected');
    }
  }
}

// Singleton instance
const producerService = new KafkaProducerService();

module.exports = producerService;
