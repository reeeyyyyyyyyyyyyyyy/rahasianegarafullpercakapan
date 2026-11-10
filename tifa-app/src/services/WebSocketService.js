/**
 * WebSocket Service for TIFA Command Control Platform
 * 
 * Handles real-time bidirectional communication with the WebSocket Gateway.
 * Protocol: SI (Session Identify), OP (Multi-Tray Operation), MOVE (Single Move), etc.
 */

const TOKEN_REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours (token expires 24h)

class WebSocketService {
  constructor() {
    this.ws = null;
    this.url = null;
    this.uiId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.reconnectTimer = null;
    this.isIntentionalDisconnect = false;

    // JWT token management
    this.jwtToken = null;
    this.tokenRefreshTimer = null;

    // Event listeners
    this.listeners = {
      open: [],
      close: [],
      error: [],
      message: [],
      reconnecting: [],
    };
  }

  /**
   * Fetch JWT token from tifa-be backend
   * @returns {Promise<string|null>} JWT token or null if failed
   */
  async fetchJwtToken() {
    try {
      const username = import.meta.env.VITE_ROBOT_USERNAME || 'robot';
      const password = import.meta.env.VITE_ROBOT_PASSWORD || 'robot123';
      const beUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

      console.log(`[WebSocket] Fetching JWT token from ${beUrl}/auth/login for user: ${username}`);
      const response = await fetch(`${beUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.token) {
        this.jwtToken = data.token;
        console.log('[WebSocket] JWT token obtained');
        return data.token;
      }
      throw new Error('No token in response');
    } catch (error) {
      console.error('[WebSocket] Failed to fetch JWT token:', error.message);
      return null;
    }
  }

  /**
   * Start periodic token refresh (every 12 hours)
   */
  startTokenRefresh() {
    this.stopTokenRefresh();
    this.tokenRefreshTimer = setInterval(async () => {
      console.log('[WebSocket] Refreshing JWT token...');
      await this.fetchJwtToken();
    }, TOKEN_REFRESH_INTERVAL);
  }

  /**
   * Stop token refresh timer
   */
  stopTokenRefresh() {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Connect to WebSocket Gateway and initialize session with SI
   * @param {string} wsUrl - WebSocket URL (e.g., "ws://localhost:3001")
   * @param {string} uiId - UI Client identifier (e.g., "UI_TIFA_001")
   */
  async connect(wsUrl, uiId) {
    // Prevent multiple concurrent connections
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.url = wsUrl;
    this.uiId = uiId;
    this.isIntentionalDisconnect = false;

    // Fetch JWT token before connecting
    await this.fetchJwtToken();
    this.startTokenRefresh();

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.emit('error', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;

      // Send SI (Session Identify) message after connection is established
      // Small delay to ensure readyState is OPEN
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.sendSessionIdentify();
        }
      }, 100);

      this.emit('open');
    };

    this.ws.onclose = (event) => {
      this.emit('close', event);

      if (!this.isIntentionalDisconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      this.emit('error', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleIncomingMessage(message);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error, event.data);
      }
    };
  }

  /**
   * Send SI (Session Identify) message to establish UI session
   */
  sendSessionIdentify() {
    const siMessage = {
      code: 'SI',
      data: {
        type: 'UI',
        ui_id: this.uiId,
        token: this.jwtToken || undefined,
      },
    };

    this.send(siMessage);
  }

  /**
   * Handle incoming messages from gateway
   */
  handleIncomingMessage(message) {
    const { code, data } = message;

    switch (code) {
      case 'ACK_SOFT':
        break;

      case 'POSITION':
        // Robot position update
        this.emit('message', { type: 'POSITION', data });
        break;

      case 'BATTERY':
        // Battery status update
        this.emit('message', { type: 'BATTERY', data });
        break;

      case 'STATUS':
        // Robot activity status
        this.emit('message', { type: 'STATUS', data });
        break;

      case 'GOAL_COMPLETE':
        // Tray delivery completed
        this.emit('message', { type: 'GOAL_COMPLETE', data });
        break;

      case 'QUEUE_COMPLETED':
        // All deliveries completed
        this.emit('message', { type: 'QUEUE_COMPLETED', data });
        break;

      case 'ROBOT_STUCK':
        // Robot is stuck
        this.emit('message', { type: 'ROBOT_STUCK', data });
        break;

      case 'EMERGENCY_STOP':
        // Emergency stop triggered
        this.emit('message', { type: 'EMERGENCY_STOP', data });
        break;

      case 'ERROR':
        // Error message from gateway
        console.error('[WebSocket] Error from gateway:', data);
        this.emit('message', { type: 'ERROR', data });
        break;

      default:
        this.emit('message', { type: code, data });
    }
  }

  /**
   * Send OP (Multi-Tray Operation) command
   * @param {string} robotId - Robot identifier (e.g., "RB001")
   * @param {number} mapId - Map identifier
   * @param {number} requestedBy - User ID who requested
   * @param {Array} trayTasks - Array of tray tasks with {tray, dest: {x, y, yaw}, goal_id}
   * @param {object} homeBase - Home base coordinates {x, y, yaw}
   */
  sendOperation(robotId, mapId, requestedBy, trayTasks, homeBase) {
    const message = {
      code: 'OP',
      data: {
        robot_id: robotId,
        type: 'OP',
        map_id: mapId,
        reqested_by: requestedBy,
        tray_tasks: trayTasks,
        home_base: homeBase, // Add home_base to OP command
      },
    };

    this.send(message);
  }

  /**
   * Send MOVE (Single Tray/Direct Move) command
   * @param {string} robotId - Robot identifier (e.g., "RB001")
   * @param {number} sequence - Sequence number (1-based)
   * @param {object} dest - Destination coordinates {x, y, yaw}
   * @param {object} homeBase - Home base coordinates {x, y, yaw}
   * @param {string} type - Optional type (GREET, SPECIAL, CHARGE, HOMEBASE, etc.)
   */
  sendMove(robotId, sequence, dest, homeBase, type = null) {
    const message = {
      code: 'MOVE',
      data: {
        robot_id: robotId,
        sequence: sequence,
        dest: dest,
        home_base: homeBase,
        ...(type && { type }), // Add type if provided (GREET, SPECIAL, etc.)
      },
    };

    return this.send(message);
  }

  /**
   * Send MODE change command
   * @param {string} robotId - Robot identifier
   * @param {string} mode - Mode (IDLE, MOVING, MAPPING, CHARGING, PAUSED)
   */
  sendMode(robotId, mode) {
    const message = {
      code: 'MODE',
      data: {
        robot_id: robotId,
        mode: mode,
      },
    };

    this.send(message);
  }

  /**
   * Send PICKUP_CONFIRM to notify backend that food has been collected
   * @param {string} robotId - Robot identifier
   * @param {number} sequence - Sequence number that was picked up
   * @param {string} uiId - UI identifier confirming the pickup
   */
  sendPickupConfirm(robotId, sequence, uiId) {
    const message = {
      code: 'PICKUP_CONFIRM',
      data: {
        robot_id: robotId,
        sequence: sequence,
        ui_id: uiId,
        timestamp: new Date().toISOString(),
      },
    };

    this.send(message);
  }

  /**
   * Send PICKUP_CANCEL to notify backend that customer cancelled pickup
   * @param {string} robotId - Robot identifier
   * @param {number} sequence - Sequence number that was cancelled
   * @param {string} uiId - UI identifier
   */
  sendPickupCancel(robotId, sequence, uiId) {
    const message = {
      code: 'PICKUP_CANCEL',
      data: {
        robot_id: robotId,
        sequence: sequence,
        ui_id: uiId,
        timestamp: new Date().toISOString(),
      },
    };

    this.send(message);
  }

  /**
   * Send INTERRUPT to request cancellation
   * @param {string} robotId - Robot identifier
   */
  sendInterrupt(robotId) {
    const message = {
      code: 'INTERRUPT',
      data: {
        robot_id: robotId,
        timestamp: new Date().toISOString(),
      },
    };

    this.send(message);
  }

  /**
   * Send INTERRUPT_CONFIRM to confirm cancellation
   * @param {string} robotId - Robot identifier
   */
  sendInterruptConfirm(robotId) {
    const message = {
      code: 'INTERRUPT_CONFIRM',
      data: {
        robot_id: robotId,
        timestamp: new Date().toISOString(),
      },
    };

    this.send(message);
  }

  /**
   * Send INTERRUPT_CANCEL to continue delivery
   * @param {string} robotId - Robot identifier
   */
  sendInterruptCancel(robotId) {
    const message = {
      code: 'INTERRUPT_CANCEL',
      data: {
        robot_id: robotId,
        timestamp: new Date().toISOString(),
      },
    };

    this.send(message);
  }

  /**
   * Send ARRIVAL_CONFIRM when robot arrives and user confirms pickup
   * @param {string} robotId - Robot identifier
   */
  sendArrivalConfirm(robotId) {
    const message = {
      code: 'ARRIVAL_CONFIRM',
      data: {
        robot_id: robotId,
        timestamp: new Date().toISOString(),
      },
    };

    this.send(message);
  }

  /**
   * Send ARRIVAL_CANCEL when robot arrives but user cancels
   * @param {string} robotId - Robot identifier
   */
  sendArrivalCancel(robotId) {
    const message = {
      code: 'ARRIVAL_CANCEL',
      data: {
        robot_id: robotId,
        timestamp: new Date().toISOString(),
      },
    };

    this.send(message);
  }

  /**
   * Send MAP_SELECTED command
   * Tells backend which map is active on this robot
   * @param {string} robotId - Robot to notify
   * @param {number} mapId   - Selected map ID
   */
  sendMapSelected(robotId, mapId) {
    this.send({
      code: 'MAP_SELECTED',
      data: {
        robot_id: robotId,
        map_id: mapId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Send generic message
   */
  send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket Service] ❌ Cannot send message: not connected');
      return false;
    }

    try {
      const payload = JSON.stringify(message);
      this.ws.send(payload);
      return true;
    } catch (error) {
      console.error('[WebSocket Service] ❌ Error sending message:', error);
      return false;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[WebSocket] ❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      this.emit('reconnecting', {
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
        failed: true
      });
      return;
    }

    this.reconnectAttempts++;

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      failed: false
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.url, this.uiId);
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    this.isIntentionalDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopTokenRefresh();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getState() {
    if (!this.ws) return 'DISCONNECTED';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'CONNECTED';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'DISCONNECTED';
      default: return 'UNKNOWN';
    }
  }

  /**
   * Event listener management
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  removeAllListeners(event) {
    if (event) {
      // Remove listeners for specific event
      if (this.listeners[event]) {
        this.listeners[event] = [];
      }
    } else {
      // Remove all listeners for all events
      Object.keys(this.listeners).forEach(key => {
        this.listeners[key] = [];
      });
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

// Create singleton instance
const wsService = new WebSocketService();

export default wsService;
