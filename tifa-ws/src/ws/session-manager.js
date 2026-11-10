const logger = require('../utils/logger');
const kafkaProducer = require('../kafka/producer');
const { generateMessageId } = require('../utils/uuid');

/**
 * Session Manager
 * Tracks all UI and Robot connections
 * Prevents duplicate UI_ID and ROBOT_ID connections
 */
class SessionManager {
  constructor() {
    // UI sessions: { ui_id: { socket, connectedAt } }
    this.uiSessions = new Map();
    
    // Robot sessions: { robot_id: { socket, connectedAt } }
    this.robotSessions = new Map();
    
    // Socket to session mapping for cleanup
    this.socketToSession = new Map();
  }

  /**
   * Check if UI_ID already exists
   * @param {string} ui_id 
   * @returns {boolean}
   */
  hasUI(ui_id) {
    return this.uiSessions.has(ui_id);
  }

  /**
   * Check if ROBOT_ID already exists
   * @param {string} robot_id 
   * @returns {boolean}
   */
  hasRobot(robot_id) {
    return this.robotSessions.has(robot_id);
  }

  /**
   * Add UI session
   * @param {string} ui_id 
   * @param {WebSocket} socket 
   * @returns {{ success: boolean, error?: string, existingSession?: object }}
   */
  addUI(ui_id, socket) {
    // Check for duplicate
    if (this.uiSessions.has(ui_id)) {
      const existingSession = this.uiSessions.get(ui_id);
      const existingRemoteAddr = existingSession.socket?._socket?.remoteAddress || 'unknown';
      const newRemoteAddr = socket._socket?.remoteAddress || 'unknown';
      
      logger.warn(`[SessionManager] ⚠️ Duplicate UI_ID detected: ${ui_id}`);
      logger.warn(`[SessionManager]   Existing connection from: ${existingRemoteAddr} (connected at: ${existingSession.connectedAt.toISOString()})`);
      logger.warn(`[SessionManager]   New connection from: ${newRemoteAddr}`);
      
      return {
        success: false,
        error: 'DUPLICATE_UI_ID',
        message: `UI_ID "${ui_id}" is already connected from ${existingRemoteAddr}`,
        existingSession: {
          connectedAt: existingSession.connectedAt,
          remoteAddr: existingRemoteAddr
        }
      };
    }

    this.uiSessions.set(ui_id, {
      socket,
      connectedAt: new Date(),
      remoteAddr: socket._socket?.remoteAddress || 'unknown'
    });
    this.socketToSession.set(socket, { type: 'UI', id: ui_id });
    logger.info(`[SessionManager] ✅ UI connected: ${ui_id} (Total UIs: ${this.uiSessions.size})`);
    
    return { success: true };
  }

  /**
   * Add Robot session
   * @param {string} robot_id 
   * @param {WebSocket} socket 
   * @returns {{ success: boolean, error?: string, existingSession?: object }}
   */
  addRobot(robot_id, socket) {
    // Check for duplicate
    if (this.robotSessions.has(robot_id)) {
      const existingSession = this.robotSessions.get(robot_id);
      const existingRemoteAddr = existingSession.socket?._socket?.remoteAddress || 'unknown';
      const newRemoteAddr = socket._socket?.remoteAddress || 'unknown';
      
      logger.warn(`[SessionManager] ⚠️ Duplicate ROBOT_ID detected: ${robot_id}`);
      logger.warn(`[SessionManager]   Existing connection from: ${existingRemoteAddr} (connected at: ${existingSession.connectedAt.toISOString()})`);
      logger.warn(`[SessionManager]   New connection from: ${newRemoteAddr}`);
      
      return {
        success: false,
        error: 'DUPLICATE_ROBOT_ID',
        message: `ROBOT_ID "${robot_id}" is already connected from ${existingRemoteAddr}`,
        existingSession: {
          connectedAt: existingSession.connectedAt,
          remoteAddr: existingRemoteAddr
        }
      };
    }

    this.robotSessions.set(robot_id, {
      socket,
      connectedAt: new Date(),
      remoteAddr: socket._socket?.remoteAddress || 'unknown'
    });
    this.socketToSession.set(socket, { type: 'ROBOT', id: robot_id });
    logger.info(`[SessionManager] ✅ Robot connected: ${robot_id} (Total Robots: ${this.robotSessions.size})`);
    
    return { success: true };
  }

  /**
   * Force disconnect existing session and replace with new one
   * Use this when you want to allow reconnection by kicking the old session
   * @param {string} ui_id 
   * @param {WebSocket} newSocket 
   * @returns {{ success: boolean, kickedOld: boolean }}
   */
  forceAddUI(ui_id, newSocket) {
    let kickedOld = false;
    
    if (this.uiSessions.has(ui_id)) {
      const existingSession = this.uiSessions.get(ui_id);
      logger.warn(`[SessionManager] 🔄 Force replacing UI session: ${ui_id}`);
      
      // Close old socket with specific code
      try {
        existingSession.socket.close(4001, 'Session replaced by new connection');
      } catch (e) {
        logger.error(`[SessionManager] Error closing old UI socket: ${e.message}`);
      }
      
      // Clean up old session
      this.socketToSession.delete(existingSession.socket);
      this.uiSessions.delete(ui_id);
      kickedOld = true;
    }

    // Add new session
    this.uiSessions.set(ui_id, {
      socket: newSocket,
      connectedAt: new Date(),
      remoteAddr: newSocket._socket?.remoteAddress || 'unknown'
    });
    this.socketToSession.set(newSocket, { type: 'UI', id: ui_id });
    logger.info(`[SessionManager] ✅ UI connected (force): ${ui_id} (Total UIs: ${this.uiSessions.size})`);
    
    return { success: true, kickedOld };
  }

  /**
   * Force disconnect existing robot session and replace with new one
   * @param {string} robot_id 
   * @param {WebSocket} newSocket 
   * @returns {{ success: boolean, kickedOld: boolean }}
   */
  forceAddRobot(robot_id, newSocket) {
    let kickedOld = false;
    
    if (this.robotSessions.has(robot_id)) {
      const existingSession = this.robotSessions.get(robot_id);
      logger.warn(`[SessionManager] 🔄 Force replacing Robot session: ${robot_id}`);
      
      // Close old socket with specific code
      try {
        existingSession.socket.close(4001, 'Session replaced by new connection');
      } catch (e) {
        logger.error(`[SessionManager] Error closing old Robot socket: ${e.message}`);
      }
      
      // Clean up old session
      this.socketToSession.delete(existingSession.socket);
      this.robotSessions.delete(robot_id);
      kickedOld = true;
    }

    // Add new session
    this.robotSessions.set(robot_id, {
      socket: newSocket,
      connectedAt: new Date(),
      remoteAddr: newSocket._socket?.remoteAddress || 'unknown'
    });
    this.socketToSession.set(newSocket, { type: 'ROBOT', id: robot_id });
    logger.info(`[SessionManager] ✅ Robot connected (force): ${robot_id} (Total Robots: ${this.robotSessions.size})`);
    
    return { success: true, kickedOld };
  }

  /**
   * Remove session by socket
   */
  removeBySocket(socket) {
    const session = this.socketToSession.get(socket);
    if (!session) return;

    const now = new Date().toISOString();
    const remoteAddr = socket._socket?.remoteAddress || 'unknown';
    if (session.type === 'UI') {
      this.uiSessions.delete(session.id);
      logger.info(`[SessionManager] UI disconnected: ${session.id}`);
      // Publish disconnect event (value must be JSON-stringified; key is origin id)
      kafkaProducer.produce('ws.session.disconnect', {
        message_id: generateMessageId(),
        origin_id: session.id,
        remote_addr: remoteAddr,
        timestamp: now
      }, session.id);
    } else if (session.type === 'ROBOT') {
      this.robotSessions.delete(session.id);
      logger.info(`[SessionManager] Robot disconnected: ${session.id}`);
      // Publish disconnect event (value must be JSON-stringified; key is origin id)
      kafkaProducer.produce('ws.session.disconnect', {
        message_id: generateMessageId(),
        origin_id: session.id,
        remote_addr: remoteAddr,
        timestamp: now
      }, session.id);
    }

    this.socketToSession.delete(socket);
  }

  /**
   * Get UI socket by ID
   */
  getUI(ui_id) {
    return this.uiSessions.get(ui_id);
  }

  /**
   * Get Robot socket by ID
   */
  getRobot(robot_id) {
    return this.robotSessions.get(robot_id);
  }

  /**
   * Get all UI sockets
   */
  getAllUIs() {
    return Array.from(this.uiSessions.values()).map(session => session.socket);
  }

  /**
   * Get all Robot sockets
   */
  getAllRobots() {
    return Array.from(this.robotSessions.values()).map(session => session.socket);
  }

  /**
   * Get session info by socket
   */
  getSessionBySocket(socket) {
    return this.socketToSession.get(socket);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      totalUIs: this.uiSessions.size,
      totalRobots: this.robotSessions.size,
      totalConnections: this.socketToSession.size
    };
  }
}

// Singleton instance
const sessionManager = new SessionManager();

module.exports = sessionManager;
