const WebSocket = require('ws');
const config = require('../config/env');
const logger = require('../utils/logger');
const sessionManager = require('./session-manager');
const messageRouter = require('./router');
const kafkaProducer = require('../kafka/producer');
const kafkaConsumer = require('../kafka/consumer');

/**
 * TIFA WebSocket Gateway Server
 * Enterprise Grade - Full Reconstruction
 */
class TIFAWebSocketServer {
  
  constructor() {
    this.wss = null;
  }

  /**
   * Start WebSocket Server
   */
  async start() {
    logger.info('='.repeat(60));
    logger.info('🔥 TIFA WEBSOCKET GATEWAY - ENTERPRISE EDITION');
    logger.info('='.repeat(60));
    
    // Initialize Kafka Producer
    try {
      await kafkaProducer.connect();
      logger.info('[Server] ✅ Kafka Producer ready');
    } catch (error) {
      logger.error('[Server] ❌ Kafka Producer failed:', error.message);
      process.exit(1);
    }
    
    // Initialize Kafka Consumer
    try {
      await kafkaConsumer.connect();
      logger.info('[Server] ✅ Kafka Consumer ready');
    } catch (error) {
      logger.error('[Server] ❌ Kafka Consumer failed:', error.message);
      process.exit(1);
    }
    
    // Create WebSocket Server
    this.wss = new WebSocket.Server({
      port: config.WS_PORT,
      perMessageDeflate: false,
      clientTracking: true
    });
    
    logger.info(`[Server] ✅ WebSocket listening on ws://localhost:${config.WS_PORT}`);
    logger.info('='.repeat(60));
    
    // Handle connections
    this.wss.on('connection', (socket, request) => {
      const clientIP = request.socket.remoteAddress;
      socket.isAlive = true;
      socket.messageTimestamps = [];
      logger.info(`[Server] 🔌 New connection from ${clientIP}`);
      
      // Handle incoming messages
      socket.on('message', async (data) => {
        const now = Date.now();
        // Keep timestamps within the last 1000ms (1 second)
        socket.messageTimestamps = socket.messageTimestamps.filter(ts => ts > now - 1000);

        if (socket.messageTimestamps.length >= 10) {
          logger.warn(`[RateLimiter] ⚠️ Client ${clientIP} exceeded WebSocket rate limit (10 msg/sec)`);
          try {
            socket.send(JSON.stringify({
              code: 'ACK_SOFT',
              data: {
                status: 'ERROR',
                error_code: 'RATE_LIMIT_EXCEEDED',
                message: 'Rate limit exceeded. Maximum 10 messages per second allowed.'
              }
            }));
          } catch {
            // Ignore send error if socket closed
          }
          return; // Drop message
        }

        socket.messageTimestamps.push(now);
        await messageRouter.handleIncomingMessage(socket, data);
      });
      
      // Handle disconnection
      socket.on('close', () => {
        sessionManager.removeBySocket(socket);
        const stats = sessionManager.getStats();
        logger.info(`[Server] 🔌 Connection closed. Stats: ${stats.totalUIs} UIs, ${stats.totalRobots} Robots`);
      });
      
      // Handle errors
      socket.on('error', (error) => {
        logger.error('[Server] ❌ Socket error:', error.message);
        sessionManager.removeBySocket(socket);
      });

      // Pong response for heartbeat
      socket.on("pong", () => {
        socket.isAlive = true;
      });
    });
    
    // Heartbeat to detect dead connections
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        // Ambil session
        const session = sessionManager.getSessionBySocket(ws);

        // Tidak punya robot_id atau ui_id → skip heartbeat
        if (!session || !session.type || !session.id) {
          return;
        }

        // Jika client tidak merespon ping → matikan
        if (ws.isAlive === false) {
          logger.warn("[Server] ⚠️ Dead client detected → terminating");
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping(); // <- WAJIB UNTUK CLOUD FLARE TUNNEL
      });
    }, 30000);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('[Server] 🛑 Shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('[Server] 🛑 Shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });
  }

  /**
   * Shutdown server
   */
  async shutdown() {
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close(() => {
        logger.info('[Server] WebSocket server closed');
      });
    }
    
    // Disconnect Kafka
    await kafkaProducer.disconnect();
    await kafkaConsumer.disconnect();
    
    logger.info('[Server] ✅ Shutdown complete');
  }
}

// Start server
const server = new TIFAWebSocketServer();
server.start().catch(error => {
  logger.error('[Server] ❌ Fatal error:', error);
  process.exit(1);
});

module.exports = server;
