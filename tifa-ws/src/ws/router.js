const logger = require('../utils/logger');
const { generateMessageId } = require('../utils/uuid');
const { validateMessage, validateSI } = require('../utils/validator');
const sessionManager = require('./session-manager');
const kafkaProducer = require('../kafka/producer');
const { TOPICS } = require('../kafka/config');
const { validateToken } = require('../utils/auth-client');

/**
 * WebSocket Message Router
 * Routes messages between UI and Robot
 * Produces ALL messages to Kafka
 */
class MessageRouter {

  /**
   * Handle incoming message from WebSocket
   */
  async handleIncomingMessage(socket, rawData) {
    try {
      // Parse JSON
      const message = JSON.parse(rawData.toString());

      // Validate structure
      const validation = validateMessage(message);
      if (!validation.valid) {
        this.sendError(socket, validation.error);
        return;
      }

      const { code, data } = message;

      // Get session info
      const session = sessionManager.getSessionBySocket(socket);

      // Handle SI (Session Identify) - special case
      if (code === 'SI') {
        await this.handleSI(socket, data);
        return;
      }

      // All other messages require active session
      if (!session) {
        this.sendError(socket, 'No active session. Send SI first.');
        return;
      }

      // Enrich message with metadata
      const enrichedMessage = {
        ...message,
        message_id: message.message_id || generateMessageId(),
        timestamp: new Date().toISOString(),
        origin: session.type,
        origin_id: session.id
      };

      // Audit: produce to ws.traffic.in
      await kafkaProducer.produce(
        TOPICS.WS_TRAFFIC_IN,
        {
          ...enrichedMessage,
          direction: 'in'
        },
        session.id
      );

      // Route message based on code and origin
      await this.routeMessage(session, enrichedMessage);

    } catch (error) {
      logger.error('[MessageRouter] ❌ Error handling message:', error.message);
      this.sendError(socket, 'Invalid message format');
    }
  }

  /**
   * Handle SI (Session Identify)
   */
  async handleSI(socket, data) {
    const validation = validateSI(data);
    if (!validation.valid) {
      this.sendError(socket, validation.error);
      return;
    }

    if (data.type === 'UI') {
      // JWT Token Authentication for UI sessions (MANDATORY)
      const authResult = await validateToken(data.token);
      if (!authResult.valid) {
        logger.warn(`[MessageRouter] ⛔ UI session authentication failed for ${data.ui_id}: ${authResult.error}`);
        this.sendToSocket(socket, {
          code: 'ERROR',
          data: {
            error: 'UNAUTHORIZED',
            message: `Authentication failed: ${authResult.error || 'Invalid or missing JWT token'}`,
            timestamp: new Date().toISOString()
          }
        });
        setTimeout(() => {
          socket.close(4003, 'Unauthorized');
        }, 100);
        return;
      }
      logger.info(`[MessageRouter] 🔒 UI session authenticated for user: ${authResult.user?.username || 'known'}`);

      // Check for duplicate and optionally force replace
      const forceReconnect = data.force === true;
      let result;

      if (forceReconnect) {
        // Force mode: kick existing session and replace
        result = sessionManager.forceAddUI(data.ui_id, socket);
        if (result.kickedOld) {
          logger.info(`[MessageRouter] 🔄 Kicked old UI session for: ${data.ui_id}`);
        }
      } else {
        // Normal mode: reject if duplicate
        result = sessionManager.addUI(data.ui_id, socket);
      }

      if (!result.success) {
        // Send DUPLICATE_ERROR and close socket
        this.sendToSocket(socket, {
          code: 'ERROR',
          data: {
            error: result.error,
            message: result.message,
            existing_session: result.existingSession,
            timestamp: new Date().toISOString()
          }
        });

        // Close socket with duplicate error code
        setTimeout(() => {
          socket.close(4002, 'Duplicate UI_ID');
        }, 100);
        return;
      }

      // Publish connection event to Kafka
      await kafkaProducer.produce('ws.session.connect', {
        message_id: generateMessageId(),
        origin_id: data.ui_id,
        connection_type: 'CLOUD_WS',
        remote_addr: socket._socket?.remoteAddress || 'unknown',
        local_addr: socket._socket?.localAddress || 'unknown',
        timestamp: new Date().toISOString()
      }, data.ui_id);

      // Send ACK_SOFT
      this.sendToSocket(socket, {
        code: 'ACK_SOFT',
        data: {
          ui_id: data.ui_id,
          message: 'UI session established',
          timestamp: new Date().toISOString()
        }
      });

    } else if (data.type === 'ROBOT') {
      // Check for duplicate and optionally force replace
      const forceReconnect = data.force === true;
      let result;

      if (forceReconnect) {
        // Force mode: kick existing session and replace
        result = sessionManager.forceAddRobot(data.robot_id, socket);
        if (result.kickedOld) {
          logger.info(`[MessageRouter] 🔄 Kicked old Robot session for: ${data.robot_id}`);
        }
      } else {
        // Normal mode: reject if duplicate
        result = sessionManager.addRobot(data.robot_id, socket);
      }

      if (!result.success) {
        // Send DUPLICATE_ERROR and close socket
        this.sendToSocket(socket, {
          code: 'ERROR',
          data: {
            error: result.error,
            message: result.message,
            existing_session: result.existingSession,
            timestamp: new Date().toISOString()
          }
        });

        // Close socket with duplicate error code
        setTimeout(() => {
          socket.close(4002, 'Duplicate ROBOT_ID');
        }, 100);
        return;
      }

      // Publish connection event to Kafka
      await kafkaProducer.produce('ws.session.connect', {
        message_id: generateMessageId(),
        origin_id: data.robot_id,
        connection_type: 'CLOUD_WS',
        remote_addr: socket._socket?.remoteAddress || 'unknown',
        local_addr: socket._socket?.localAddress || 'unknown',
        timestamp: new Date().toISOString()
      }, data.robot_id);

      // Send ACK_SOFT
      this.sendToSocket(socket, {
        code: 'ACK_SOFT',
        data: {
          robot_id: data.robot_id,
          message: 'Robot session established',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Route message based on origin and code
   */
  async routeMessage(session, message) {
    const { code, data, origin } = message;

    logger.info(`[MessageRouter] 📨 Routing ${code} from ${origin}:${session.id}`);

    if (origin === 'UI') {
      // Message from UI
      await this.handleUIMessage(message);
    } else if (origin === 'ROBOT') {
      // Message from Robot
      await this.handleRobotMessage(message);
    }
  }

  /**
   * UI code → Kafka topic map.
   * Any code NOT listed here falls back to TOPICS.WS_MISC_UI,
   * guaranteeing ALL messages reach Kafka and get audited.
   */
  static UI_TOPIC_MAP = {
    MOVE: 'UI_COMMAND_MOVE',
    OP: 'UI_COMMAND_OP',
    MODE: 'UI_COMMAND_MODE',
    SHB: 'UI_COMMAND_SHB',
    DM: 'UI_COMMAND_DM',
    SCS: 'UI_COMMAND_SCS',
    MAP_SELECTED: 'UI_COMMAND_MAP_SELECTED',
    // Delivery lifecycle
    PICKUP_CONFIRM: 'UI_COMMAND_PICKUP_CONFIRM',
    PICKUP_CANCEL: 'UI_COMMAND_PICKUP_CANCEL',
    INTERRUPT: 'UI_COMMAND_INTERRUPT',
    INTERRUPT_CONFIRM: 'UI_COMMAND_INTERRUPT_CONFIRM',
    INTERRUPT_CANCEL: 'UI_COMMAND_INTERRUPT_CANCEL',
    ARRIVAL_CONFIRM: 'UI_COMMAND_ARRIVAL_CONFIRM',
    ARRIVAL_CANCEL: 'UI_COMMAND_ARRIVAL_CANCEL',
    // Speed control
    SPEED: 'UI_COMMAND_SPEED',
    TELEOP: 'UI_COMMAND_TELEOP',
    MAPPING_START: 'UI_COMMAND_MAPPING_START',
    MAPPING_CANCEL: 'UI_COMMAND_MAPPING_CANCEL',
    MAP_DATA: 'UI_COMMAND_MAP_DATA',
  };

  /**
   * Handle message from UI
   */
  async handleUIMessage(message) {
    const { code, data, origin_id } = message;

    // Map code → topic key, fallback to catch-all
    const topicKey = MessageRouter.UI_TOPIC_MAP[code];
    const topic = topicKey ? TOPICS[topicKey] : TOPICS.WS_MISC_UI;

    if (!topicKey) {
      logger.warn(`[MessageRouter] Unknown UI command '${code}' → routing to ${topic}`);
    }

    // Produce to Kafka — ALWAYS, no silent drops
    await kafkaProducer.produce(topic, message, data.robot_id || null);

    // Forward INSTANTLY to robot (low latency!)
    if (data.robot_id) {
      const robotSession = sessionManager.getRobot(data.robot_id);

      if (robotSession) {
        // Inject ui_id so robot knows where to reply
        const enrichedData = { ...data, ui_id: origin_id };
        this.sendToSocket(robotSession.socket, { code, data: enrichedData });
        logger.info(`[MessageRouter] ✅ Forwarded ${code} to robot ${data.robot_id} (UI: ${origin_id})`);
      } else {
        logger.error(`[MessageRouter] ❌ Robot ${data.robot_id} not connected`);
      }
    }
  }

  /**
   * Robot code → Kafka topic key map.
   * Unknown codes fall back to TOPICS.WS_MISC_ROBOT.
   */
  static ROBOT_TOPIC_MAP = {
    POSITION: 'ROBOT_STATE_POSITION',
    BATTERY: 'ROBOT_STATE_BATTERY',
    STATUS: 'ROBOT_STATE_STATUS',
    GOAL_COMPLETE: 'ROBOT_EVENT_GOAL_COMPLETE',
    MAPPING_COMPLETE: 'ROBOT_EVENT_MAPPING_COMPLETE',
    ROBOT_STUCK: 'ROBOT_EVENT_ROBOT_STUCK',
    EMERGENCY_STOP: 'ROBOT_EVENT_EMERGENCY_STOP',
    EXPRESSION: 'ROBOT_EVENT_EXPRESSION',
    ACK: 'ROBOT_COMMAND_ACK',
    // Previously missing — fell through to ws.misc.robot
    MOVE_COMPLETED: 'ROBOT_EVENT_MOVE_COMPLETED',
    INIT: 'ROBOT_EVENT_INIT',
  };

  /**
   * Handle message from Robot
   */
  async handleRobotMessage(message) {
    const { code, data } = message;

    // Map code → topic key, fallback to catch-all
    const topicKey = MessageRouter.ROBOT_TOPIC_MAP[code];
    const topic = topicKey ? TOPICS[topicKey] : TOPICS.WS_MISC_ROBOT;

    if (!topicKey) {
      logger.warn(`[MessageRouter] Unknown robot code '${code}' → routing to ${topic}`);
    }

    // Produce to Kafka — ALWAYS, no silent drops
    await kafkaProducer.produce(topic, message, data.robot_id || null);

    // Forward to UI
    if (data.ui_id) {
      // Send to SPECIFIC UI
      const uiSession = sessionManager.getUI(data.ui_id);
      if (uiSession) {
        this.sendToSocket(uiSession.socket, { code, data });
        logger.info(`[MessageRouter] ✅ Sent ${code} to UI ${data.ui_id}`);
      } else {
        logger.warn(`[MessageRouter] ⚠️ UI ${data.ui_id} not connected, message dropped`);
      }
    } else {
      // Broadcast to ALL UIs (legacy behavior)
      const uiSockets = sessionManager.getAllUIs();
      uiSockets.forEach(socket => this.sendToSocket(socket, { code, data }));
      logger.info(`[MessageRouter] ✅ Broadcasted ${code} to ${uiSockets.length} UIs`);
    }
  }

  /**
   * Send message to socket
   */
  sendToSocket(socket, message) {
    try {
      const jsonMessage = JSON.stringify(message);
      socket.send(jsonMessage);

      // Audit outgoing traffic
      kafkaProducer.produce(
        TOPICS.WS_TRAFFIC_OUT,
        {
          ...message,
          direction: 'out',
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      logger.error('[MessageRouter] ❌ Failed to send message:', error.message);
    }
  }

  /**
   * Send error message
   */
  sendError(socket, errorMessage) {
    this.sendToSocket(socket, {
      code: 'ERROR',
      data: {
        message: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Singleton instance
const messageRouter = new MessageRouter();

module.exports = messageRouter;
