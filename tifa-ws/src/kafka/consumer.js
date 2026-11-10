const { kafka, TOPICS } = require('./config');
const logger = require('../utils/logger');
const sessionManager = require('../ws/session-manager');

/**
 * Kafka Consumer
 * Consumes be.command.dispatch_next_tray and forwards to robot
 */
class KafkaConsumerService {
  constructor() {
    this.consumer = kafka.consumer({
      groupId: 'tifa-ws-gateway-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    this.connected = false;
  }

  /**
   * Connect and subscribe to topics
   */
  async connect() {
    try {
      await this.consumer.connect();
      
      // Subscribe to BE command topics
      await this.consumer.subscribe({
        topic: TOPICS.BE_COMMAND_DISPATCH_NEXT_TRAY,
        fromBeginning: false
      });
      
      await this.consumer.subscribe({
        topic: TOPICS.BE_QUEUE_COMPLETED,
        fromBeginning: false
      });
      
      this.connected = true;
      logger.info('[KafkaConsumer] ✅ Connected and subscribed to topics');
      
      // Start consuming
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.handleMessage(topic, message);
        }
      });
      
    } catch (error) {
      logger.error('[KafkaConsumer] ❌ Failed to connect:', error.message);
      throw error;
    }
  }

  /**
   * Handle incoming message from Kafka
   */
  async handleMessage(topic, message) {
    try {
      const payload = JSON.parse(message.value.toString());
      
      logger.info(`[KafkaConsumer] 📨 Received from ${topic}:`, payload.message_id || 'no-id');
      
      switch (topic) {
        case TOPICS.BE_COMMAND_DISPATCH_NEXT_TRAY:
          await this.handleDispatchNextTray(payload);
          break;
          
        case TOPICS.BE_QUEUE_COMPLETED:
          await this.handleQueueCompleted(payload);
          break;
          
        default:
          logger.warn(`[KafkaConsumer] Unknown topic: ${topic}`);
      }
    } catch (error) {
      logger.error('[KafkaConsumer] ❌ Error handling message:', error.message);
    }
  }

  /**
   * Handle dispatch_next_tray command from backend
   * Forward MOVE command to robot
   */
  async handleDispatchNextTray(payload) {
    const { robot_id, sequence, dest, message_id } = payload;
    
    logger.info(`[KafkaConsumer] 🚀 Dispatching next tray to ${robot_id}: seq=${sequence}`);
    
    // Get robot session
    const robotSession = sessionManager.getRobot(robot_id);
    
    if (!robotSession) {
      logger.error(`[KafkaConsumer] ❌ Robot ${robot_id} not connected`);
      return;
    }
    
    // Prepare MOVE command
    const moveCommand = {
      code: 'MOVE',
      data: {
        robot_id,
        sequence,
        dest,
        message_id
      }
    };
    
    // Send to robot
    try {
      robotSession.socket.send(JSON.stringify(moveCommand));
      logger.info(`[KafkaConsumer] ✅ Sent MOVE to robot ${robot_id}`);
    } catch (error) {
      logger.error(`[KafkaConsumer] ❌ Failed to send to robot:`, error.message);
    }
  }

  /**
   * Handle queue completed event
   * Broadcast to all UIs
   */
  async handleQueueCompleted(payload) {
    const { robot_id } = payload;
    
    logger.info(`[KafkaConsumer] 🏁 Queue completed by robot ${robot_id}`);
    
    // Broadcast to all UIs
    const uiSockets = sessionManager.getAllUIs();
    
    const completedMessage = {
      code: 'QUEUE_COMPLETED',
      data: {
        robot_id,
        timestamp: new Date().toISOString()
      }
    };
    
    uiSockets.forEach(socket => {
      try {
        socket.send(JSON.stringify(completedMessage));
      } catch (error) {
        logger.error('[KafkaConsumer] ❌ Failed to broadcast to UI:', error.message);
      }
    });
    
    logger.info(`[KafkaConsumer] ✅ Broadcasted queue completion to ${uiSockets.length} UIs`);
  }

  /**
   * Disconnect consumer
   */
  async disconnect() {
    if (this.connected) {
      await this.consumer.disconnect();
      this.connected = false;
      logger.info('[KafkaConsumer] Disconnected');
    }
  }
}

// Singleton instance
const consumerService = new KafkaConsumerService();

module.exports = consumerService;
