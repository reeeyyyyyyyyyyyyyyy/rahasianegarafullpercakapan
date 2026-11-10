import { create } from 'zustand';
import commManager, { COMM_MODE } from '../services/CommunicationManager';
import { audioService } from '../services/AudioService';
import { useUIStore } from './uiStore';
import { useSettingsStore } from './settingsStore';
import { db } from '../database/indexedDB';

export const useWebSocketStore = create((set, get) => ({
  // Connection state
  isConnected: false,
  connectionState: 'DISCONNECTED', // DISCONNECTED, CONNECTING, CONNECTED, CLOSING
  reconnectAttempts: 0,

  // Dual connection status
  wsConnected: false,
  adbConnected: false,

  // Home base configuration
  homeBase: null, // Will be loaded from IndexedDB

  // Robot state
  robotPosition: null, // { x, y, yaw, robot_id, timestamp }
  robotBattery: null,  // { battery_percent, voltage, robot_id, timestamp }
  robotStatus: null,   // { status, robot_id, timestamp }

  // Delivery state
  activeDelivery: null, // Current active delivery info
  completedGoals: [],   // Array of completed goal sequences
  shouldReturnHome: true, // Whether to return to home base after delivery
  isReturningHome: false, // Flag to prevent duplicate return home calls
  queueCompletedTimeout: null, // Timeout to detect QUEUE_COMPLETED

  // Set active delivery manually (for navigation from mode pages)
  setActiveDelivery: (delivery) => set({ activeDelivery: delivery }),

  // Clear active delivery
  clearActiveDelivery: () => set({ activeDelivery: null, completedGoals: [] }),

  // Alerts
  alerts: [], // Array of { type, message, timestamp }

  // Expression state
  currentExpression: null, // { type, message, timestamp }

  // Robot error state
  robotError: null, // { error_code, error_message, severity, timestamp }
  robotErrors: [], // History of errors

  // Robot initialization state
  robotInit: null, // { status, init_message, timestamp }
  isRobotInitializing: false,

  /**
   * Initialize WebSocket connection
   */
  connect: async () => {
    // Load home base from IndexedDB first
    await get().loadHomeBase();

    // Load battery state from IndexedDB
    await get().loadBatteryState();

    // Get connection config from settings store
    const { settings } = useSettingsStore.getState();
    const wsUrl = settings?.ws_url || import.meta.env.VITE_WS_URL;
    const uiId = settings?.ui_id || import.meta.env.VITE_UI_ID;

    // Remove all old listeners to prevent duplicates
    commManager.removeAllListeners();

    // Setup event listeners - called when ANY service connects
    commManager.on('open', () => {
      // Update connection status based on CommManager's combined status
      const isNowConnected = commManager.isConnected();
      const status = commManager.getConnectionStatus();

      set({
        isConnected: isNowConnected,
        connectionState: isNowConnected ? 'CONNECTED' : 'CONNECTING',
        reconnectAttempts: 0,
        wsConnected: status.wsConnected,
        adbConnected: status.adbConnected,
      });

      // Show success toast with which service connected
      const { addToast } = useUIStore.getState();
      const connectedVia = status.wsConnected && status.adbConnected
        ? 'WebSocket + ADB'
        : status.wsConnected
          ? 'WebSocket'
          : 'ADB';
      addToast({
        type: 'success',
        message: `✅ Connected via ${connectedVia}`,
      });
    });

    commManager.on('close', ({ service, serviceName }) => {
      // Update connection status based on CommManager's combined status
      const isStillConnected = commManager.isConnected();
      const status = commManager.getConnectionStatus();

      set({
        isConnected: isStillConnected,
        connectionState: isStillConnected ? 'CONNECTED' : 'DISCONNECTED',
        wsConnected: status.wsConnected,
        adbConnected: status.adbConnected,
      });

      const { addToast } = useUIStore.getState();

      if (!isStillConnected) {
        // Completely disconnected - show which service
        addToast({
          type: 'warning',
          message: `⚠️ ${serviceName}: Disconnected from server`,
        });
      } else {
        // One service disconnected but other still connected - fallback
        const fallbackService = status.wsConnected ? 'WebSocket' : 'ADB';
        addToast({
          type: 'info',
          message: `🔄 ${serviceName} disconnected, using ${fallbackService}`,
        });
      }
    });

    commManager.on('error', ({ serviceName }) => {
      console.error(`[WS Store] ${serviceName} Error`);
      get().addAlert('error', `${serviceName} connection error`);
    });

    commManager.on('reconnecting', ({ attempt, maxAttempts, failed, serviceName }) => {
      set({
        connectionState: 'CONNECTING',
        reconnectAttempts: attempt,
      });

      // Show toast based on reconnection state
      const { addToast } = useUIStore.getState();
      const source = serviceName || 'Service';

      if (failed) {
        // Max reconnection attempts reached
        addToast({
          type: 'error',
          message: `❌ ${source}: Failed to reconnect after ${maxAttempts} attempts`,
        });
      } else {
        // Reconnecting...
        addToast({
          type: 'info',
          message: `🔄 ${source}: Reconnecting... (${attempt}/${maxAttempts})`,
        });
      }
    });

    commManager.on('message', (message) => {
      get().handleMessage(message);
    });

    // Connect using CommunicationManager (handles mode switching internally)
    set({ connectionState: 'CONNECTING' });
    commManager.connect(wsUrl, uiId);
  },

  /**
   * Disconnect from WebSocket
   */
  disconnect: () => {
    commManager.disconnect();
    set({
      isConnected: false,
      connectionState: 'DISCONNECTED',
      reconnectAttempts: 0,
      wsConnected: false,
      adbConnected: false,
    });
  },

  /**
   * Reconnect WebSocket (disconnect then connect)
   */
  reconnect: () => {
    get().disconnect();
    setTimeout(() => {
      get().connect();
    }, 500);
  },

  /**
   * Refresh connection status from CommManager
   * Useful when status might be stale
   */
  refreshStatus: () => {
    const status = commManager.refreshConnectionStatus();
    set({
      isConnected: status.wsConnected || status.adbConnected,
      connectionState: (status.wsConnected || status.adbConnected) ? 'CONNECTED' : 'DISCONNECTED',
      wsConnected: status.wsConnected,
      adbConnected: status.adbConnected,
    });
    return status;
  },

  /**
   * Handle incoming messages
   */
  handleMessage: (message) => {
    const { type, data } = message;

    switch (type) {
      case 'POSITION':
        set({ robotPosition: { ...data, timestamp: Date.now() } });
        break;

      case 'BATTERY':
        // Update state
        const batteryData = { ...data, timestamp: Date.now() };
        set({ robotBattery: batteryData });

        // Persist to IndexedDB
        (async () => {
          try {

            await db.robot_state.put({
              state_key: 'battery',
              battery_level: data.battery_level,
              battery_percent: data.battery_percent,
              voltage: data.voltage,
              robot_id: data.robot_id,
              ui_id: data.ui_id,
              timestamp: Date.now()
            });
          } catch (error) {
            console.error('Failed to save battery to IndexedDB:', error);
          }
        })();
        break;

      case 'STATUS':
        set({ robotStatus: { ...data, timestamp: Date.now() } });
        break;

      case 'GOAL_COMPLETE':
        // Add to completed goals
        const newCompletedGoals = [...get().completedGoals, data.sequence];
        set({ completedGoals: newCompletedGoals });

        // Check if this is the last goal in active delivery
        const { activeDelivery } = get();
        const isLastGoal = activeDelivery &&
          activeDelivery.trayTasks &&
          newCompletedGoals.length >= activeDelivery.trayTasks.length;

        // 🔊 Play arrival notification sound to alert customer
        audioService.announceArrival(data.destination || `Tray ${data.sequence}`, true);

        // Always show pickup confirmation dialog (including for single tray / last goal)
        const { openConfirmDialog, showThankYouOverlay } = useUIStore.getState();
        openConfirmDialog(
          `🍽️ Tray ${data.sequence} Arrived!`,
          `Tifa has arrived at destination with Tray ${data.sequence}.\n\nHas the food been picked up by the customer?`,
          () => {
            // User confirms pickup - send confirmation to backend
            get().confirmPickup(data.robot_id, data.sequence);

            // 🔊 Play success sound on confirm
            audioService.playNotification('success');

            // Show Thank You overlay for EVERY customer (every tray)
            showThankYouOverlay('Thank you for using Tifa!');

            // Trigger happy expression after Thank You (with delay to show Thank You first)
            setTimeout(() => {
              get().triggerExpression('happy', `Tray ${data.sequence} delivered!`);
            }, 2500);

            if (isLastGoal) {
              // Set timeout to wait for QUEUE_COMPLETED (3 seconds)
              const timeoutId = setTimeout(() => {
                set({ queueCompletedTimeout: null });
              }, 3000);

              set({ queueCompletedTimeout: timeoutId });
            }
          },
          // Cancel callback - send cancel to backend and show confused expression
          () => {
            get().cancelPickup(data.robot_id, data.sequence);

            // 🔊 Play warning sound on cancel
            audioService.playNotification('warning');

            // Always show confused expression
            get().triggerExpression('confused', 'Pickup cancelled...');

            // If last goal cancelled, also hide overlay and clear state
            if (isLastGoal) {
              set({
                activeDelivery: null,
                completedGoals: [],
              });

              const { hideDeliveryInProgress: hideCancelOverlay } = useUIStore.getState();
              hideCancelOverlay();
            }
            // If not last goal, robot will continue to next tray (overlay stays)
          }
        );
        break;

      case 'MOVE_COMPLETED':
        // Direct delivery (MOVE) completed
        const { activeDelivery: completedDelivery } = get();

        // Determine message based on delivery type
        let successMessage = '🎉 Direct delivery successful!';
        let confirmTitle = '🍽️ Arrived!';
        let confirmMessage = 'Tifa has arrived at destination.\n\nHas the item been picked up?';
        let needsConfirm = true; // Most modes need pickup confirm
        let moveDeliveryType = null; // Track delivery type for expression

        if (completedDelivery?.type === 'MOVE') {
          moveDeliveryType = completedDelivery.movementType; // GREET, SPECIAL, HOMEBASE, CHARGE, CRUISE, or null
          const destName = completedDelivery.destination || 'destination';

          // 🔊 Play arrival notification sound to alert customer
          if (moveDeliveryType !== 'HOMEBASE' && moveDeliveryType !== 'CHARGE') {
            audioService.announceArrival(destName, true);
          } else {
            // Just play a chime for homebase/charge (no speech)
            audioService.playNotification('chime');
          }

          if (moveDeliveryType === 'GREET') {
            confirmTitle = '👋 Greet & Guide Complete!';
            confirmMessage = `Tifa has arrived at ${destName} to greet and guide.\n\nHas the guest been guided?`;
            successMessage = '🎉 Greet & guide completed!';
          } else if (moveDeliveryType === 'SPECIAL') {
            confirmTitle = '⭐ Special Delivery Arrived!';
            confirmMessage = `Tifa has arrived at ${destName} with special delivery.\n\nHas the item been picked up?`;
            successMessage = '🎉 Special delivery completed!';
          } else if (moveDeliveryType === 'CRUISE') {
            confirmTitle = '🚢 Cruise Point Reached!';
            confirmMessage = `Tifa has arrived at ${destName}.\n\nReady to continue?`;
            successMessage = '🎉 Cruise point reached!';
          } else if (moveDeliveryType === 'HOMEBASE') {
            successMessage = '🏠 Arrived at home base!';
            needsConfirm = false; // No confirm needed for return home
          } else if (moveDeliveryType === 'CHARGE') {
            successMessage = '🔋 Arrived at charging station!';
            needsConfirm = false; // No confirm needed for charging
          } else {
            // Direct delivery (no specific type)
            confirmTitle = '🍽️ Direct Delivery Arrived!';
            confirmMessage = `Tifa has arrived at ${destName}.\n\nHas the food been picked up?`;
            successMessage = '🎉 Direct delivery completed!';
          }
        }

        if (needsConfirm) {
          // Show pickup confirmation dialog for Direct, Cruise, Greet, Special
          const { openConfirmDialog: openMoveConfirm, showThankYouOverlay: showMoveThankYou } = useUIStore.getState();
          openMoveConfirm(
            confirmTitle,
            confirmMessage,
            () => {
              // Send ARRIVAL_CONFIRM to WebSocket (robot has arrived and user confirms)
              get().sendArrivalConfirm();

              // 🔊 Play success sound on confirm
              audioService.playNotification('success');

              // User confirms - clear delivery state
              set({
                activeDelivery: null,
                completedGoals: [],
              });

              // Hide delivery overlay
              const { hideDeliveryInProgress: hideMoveOverlay } = useUIStore.getState();
              hideMoveOverlay();

              // Show Thank You overlay
              showMoveThankYou('Thank you for using Tifa!');

              // Trigger happy expression after Thank You (with delay to show Thank You first)
              setTimeout(() => {
                get().triggerExpression('happy', successMessage);
              }, 2500);
            },
            // Cancel callback - send ARRIVAL_CANCEL and show confused expression
            () => {
              get().sendArrivalCancel();

              // 🔊 Play warning sound on cancel
              audioService.playNotification('warning');

              // Clear delivery state
              set({
                activeDelivery: null,
                completedGoals: [],
              });

              // Hide delivery overlay first
              const { hideDeliveryInProgress: hideCancelOverlay } = useUIStore.getState();
              hideCancelOverlay();

              // Then trigger confused expression
              get().triggerExpression('confused', 'Task cancelled...');
            }
          );
        } else {
          // No confirm needed (HOMEBASE, CHARGE) - just complete
          set({
            activeDelivery: null,
            completedGoals: [],
          });

          // Hide delivery overlay
          const { hideDeliveryInProgress: hideMoveOverlay } = useUIStore.getState();
          hideMoveOverlay();

          // Show success toast
          const { addToast: addMoveSuccessToast } = useUIStore.getState();
          addMoveSuccessToast({
            type: 'success',
            message: successMessage,
          });

          // Trigger appropriate expression based on type
          setTimeout(() => {
            if (moveDeliveryType === 'HOMEBASE') {
              get().triggerExpression('relieved', 'Home sweet home!');
            } else if (moveDeliveryType === 'CHARGE') {
              get().triggerExpression('energized', 'Charging up!');
            } else {
              get().triggerExpression('happy', successMessage);
            }
          }, 1500);
        }
        break;

      case 'QUEUE_COMPLETED':
        // Clear any pending timeout
        const { queueCompletedTimeout } = get();
        if (queueCompletedTimeout) {
          clearTimeout(queueCompletedTimeout);
          set({ queueCompletedTimeout: null });
        }

        // Prevent duplicate QUEUE_COMPLETED processing
        if (get().isReturningHome) {
          return;
        }

        // All deliveries completed
        set({
          activeDelivery: null,
          completedGoals: [],
          isReturningHome: true, // Set flag to prevent duplicates
        });

        // Hide delivery overlay
        const { hideDeliveryInProgress } = useUIStore.getState();
        hideDeliveryInProgress();

        // Show success toast
        const { addToast: addSuccessToast } = useUIStore.getState();
        addSuccessToast({
          type: 'success',
          message: '🎉 All deliveries completed!',
        });

        // Trigger happy expression with delay
        setTimeout(() => {
          get().triggerExpression('happy', 'All deliveries completed!');
        }, 1500);

        // Auto-return to home base if enabled
        if (get().shouldReturnHome) {
          setTimeout(() => {
            // get().returnToHomeBase();

            // Reset flag after return home is sent
            setTimeout(() => {
              set({ isReturningHome: false });
            }, 5000); // Reset after 5 seconds
          }, 2000); // Wait 2 seconds before returning
        } else {
          // Reset flag if not returning home
          set({ isReturningHome: false });
        }
        break;

      case 'ROBOT_STUCK':
        const { addToast: addWarningToast } = useUIStore.getState();
        addWarningToast({
          type: 'warning',
          message: `⚠️ Tifa is stuck: ${data.reason || 'Unknown'}`,
        });
        break;

      case 'EMERGENCY_STOP':
        const { addToast: addErrorToast } = useUIStore.getState();
        addErrorToast({
          type: 'error',
          message: `🚨 Emergency Stop: ${data.reason || 'Tidak diketahui'}`,
        });
        break;

      case 'ERROR':
        // Handle robot error - data is already unwrapped
        get().handleRobotError(data);
        break;

      case 'INIT':
        // Handle robot initialization - data is already unwrapped
        get().handleRobotInit(data);
        break;

      case 'EXPRESSION':
        // Handle robot expression with multiple types
        get().handleExpression(data);
        break;

      case 'MAP_SELECTED':
        // Incoming confirmation that map selection was acknowledged
        (async () => {
          try {
            await db.settings.put({ setting_key: 'map_id', setting_value: String(data.map_id), setting_type: 'number' });
          } catch (e) {
            console.error('[WS Store] Failed to persist map_id to DB:', e);
          }
        })();
        break;

      default:
        break;
    }
  },

  /**
   * Send MAP_SELECTED command
   * @param {number} mapId - ID of the selected map
   */
  sendMapSelected: (mapId) => {
    const { settings } = useSettingsStore.getState();
    const robotId = settings?.robot_id;
    if (!robotId) {
      console.error('[WS Store] Cannot send MAP_SELECTED: robot_id not set');
      return;
    }
    commManager.sendMapSelected(robotId, mapId);
  },

  /**
   * Send OP (Multi-Tray Operation) command
   * @param {Array} trayMapping - Object with tray numbers as keys and destination objects as values
   * @param {Object} destinationCoords - Map of destination names to {x, y, yaw} coordinates (not used anymore)
   * @param {number} userId - User ID who requested the operation
   */
  sendOperation: async (trayMapping, destinationCoords, userId = 1) => {
    try {
      // Get config from settings store
      const { settings } = useSettingsStore.getState();
      const robotId = settings?.robot_id;
      const mapId = settings?.map_id || 1;
      let { homeBase } = get();

      // Load home base if not yet loaded
      if (!homeBase) {
        await get().loadHomeBase();
        homeBase = get().homeBase;
      }

      // Import IndexedDB


      // Build tray_tasks array from destination objects
      const trayTasksPromises = [];

      for (const [tray, dests] of Object.entries(trayMapping)) {
        if (!dests || dests.length === 0) continue;

        for (let index = 0; index < dests.length; index++) {
          const dest = dests[index];

          // dest is now an object with x, y, yaw properties
          if (!dest || dest.x === undefined || dest.y === undefined) {
            console.warn(`[WS Store] Invalid destination object:`, dest);
            continue;
          }

          // Lookup destination_id from IndexedDB by coordinates
          // Use a small tolerance for floating point comparison (0.01)
          const tolerance = 0.01;
          const destination = await db.destinations
            .toArray()
            .then(destinations =>
              destinations.find(d =>
                Math.abs(d.x - dest.x) < tolerance &&
                Math.abs(d.y - dest.y) < tolerance &&
                Math.abs(d.yaw - dest.yaw) < tolerance
              )
            );

          const goalId = destination?.destination_id || `${tray}_${index}_${Date.now()}`;

          trayTasksPromises.push({
            tray: parseInt(tray),
            dest: {
              x: dest.x,
              y: dest.y,
              yaw: dest.yaw
            },
            goal_id: goalId,
          });
        }
      }

      const trayTasks = trayTasksPromises;

      if (trayTasks.length === 0) {
        console.error('[WS Store] ❌ No valid tray tasks to send');
        return false;
      }

      if (!robotId) {
        console.error('[WS Store] ❌ No robot_id configured!');
        const { addToast } = useUIStore.getState();
        addToast({
          type: 'error',
          message: '❌ Robot ID not configured',
        });
        return false;
      }

      // Send OP command with home_base
      commManager.sendOperation(robotId, mapId, userId, trayTasks, homeBase);

      // Store active delivery info
      set({
        activeDelivery: {
          type: 'OP',
          trayTasks,
          startTime: Date.now(),
        },
        completedGoals: [],
        isReturningHome: false, // Reset flag for new delivery
      });

      // Show info toast
      const { addToast } = useUIStore.getState();
      addToast({
        type: 'info',
        message: `📦 Sending delivery command: ${trayTasks.length} destinations`,
      });

      return true;
    } catch (error) {
      console.error('[WS Store] Failed to send OP command:', error);

      // Show error toast
      const { addToast } = useUIStore.getState();
      addToast({
        type: 'error',
        message: '❌ Failed to send delivery command',
      });

      return false;
    }
  },

  /**
   * Send MOVE command to robot
   * @param {string} destName - Destination name
   * @param {Object} destCoords - Destination coordinates {x, y, yaw}
   * @param {number} sequence - Sequence number (default: 1)
   * @param {string} type - Optional type: "GREET", "SPECIAL", etc.
   */
  sendMove: async (destName, destCoords, sequence = 1, type = null) => {
    try {
      // Get config from settings store
      const { settings } = useSettingsStore.getState();
      const robotId = settings?.robot_id;
      let { homeBase } = get();

      // Load home base if not yet loaded
      if (!homeBase) {
        await get().loadHomeBase();
        homeBase = get().homeBase;
      }

      if (!robotId) {
        console.error('[WS Store] ❌ No robot_id configured in settings!');
        const { addToast } = useUIStore.getState();
        addToast({
          type: 'error',
          message: '❌ Robot ID not configured',
        });
        return false;
      }

      if (!destCoords) {
        console.error('[WS Store] ❌ No coordinates provided for MOVE command');
        return false;
      }

      // Lookup destination_id from IndexedDB

      const tolerance = 0.01;
      const destination = await db.destinations
        .toArray()
        .then(destinations =>
          destinations.find(d =>
            Math.abs(d.x - destCoords.x) < tolerance &&
            Math.abs(d.y - destCoords.y) < tolerance &&
            Math.abs(d.yaw - destCoords.yaw) < tolerance
          )
        );

      const goalId = destination?.destination_id || sequence;

      // Send MOVE command with home_base, optional type, and goal_id
      commManager.sendMove(robotId, goalId, destCoords, homeBase, type);

      // Set active delivery state
      set({
        activeDelivery: {
          type: 'MOVE',
          movementType: type, // Store movement type: GREET, SPECIAL, HOMEBASE, CHARGE, or null
          destination: destName,
          coords: destCoords,
          sequence: goalId,
          startTime: Date.now(),
        },
        completedGoals: [],
        isReturningHome: false, // Reset flag for new delivery
      });

      // Show info toast
      const { addToast } = useUIStore.getState();
      addToast({
        type: 'info',
        message: `🚀 Sending Tifa to ${destName}`,
      });

      return true;
    } catch (error) {
      console.error('[WS Store] Failed to send MOVE command:', error);

      // Show error toast
      const { addToast } = useUIStore.getState();
      addToast({
        type: 'error',
        message: '❌ Failed to send move command',
      });

      return false;
    }
  },

  /**
   * Send MODE change command
   * @param {string} mode - Mode (IDLE, MOVING, MAPPING, CHARGING, PAUSED)
   */
  sendMode: (mode) => {
    // Get config from settings store
    const { robotId } = useSettingsStore.getState();

    try {
      commManager.sendMode(robotId, mode);
      return true;
    } catch (error) {
      console.error('[WS Store] Failed to send MODE command:', error);
      return false;
    }
  },

  /**
   * Confirm food pickup by user
   * Sends PICKUP_CONFIRM to backend to trigger next delivery
   * @param {string} robotId - Robot identifier
   * @param {number} sequence - Sequence number that was picked up
   */
  confirmPickup: (robotId, sequence) => {
    const { uiId } = get();

    try {
      commManager.sendPickupConfirm(robotId, sequence, uiId);
      return true;
    } catch (error) {
      console.error('[WS Store] Failed to send PICKUP_CONFIRM:', error);

      // Show error toast
      const { addToast } = useUIStore.getState();
      addToast({
        type: 'error',
        message: '❌ Failed to send pickup confirmation',
      });

      return false;
    }
  },

  /**
  /**
   * Cancel pickup at destination for OP mode
   * Sends PICKUP_CANCEL to backend so robot knows to continue/return
   * @param {string} robotId - Robot identifier
   * @param {number} sequence - Sequence number that was cancelled
   */
  cancelPickup: (robotId, sequence) => {
    const { uiId } = get();

    try {
      commManager.sendPickupCancel(robotId, sequence, uiId);

      // Show info toast
      const { addToast } = useUIStore.getState();
      addToast({
        type: 'info',
        message: `📦 Tray ${sequence} pickup cancelled`,
      });

      return true;
    } catch (error) {
      console.error('[WS Store] Failed to send PICKUP_CANCEL:', error);
      return false;
    }
  },

  /**
   * Return robot to home base
   * Called after all deliveries are completed
   */
  returnToHomeBase: async () => {
    // Get config from settings store
    const { robotId } = useSettingsStore.getState();
    let { homeBase } = get();

    // Load home base if not yet loaded
    if (!homeBase) {
      await get().loadHomeBase();
      homeBase = get().homeBase;
    }

    // Check if home base is configured (just check if object exists)
    if (!homeBase) {
      const { addToast } = useUIStore.getState();
      addToast({
        type: 'warning',
        message: '⚠️ Home base not configured yet',
      });
      return false;
    }

    try {
      // Send MOVE command to home base
      commManager.sendMove(robotId, 999, homeBase, homeBase);

      // Show info toast
      const { addToast } = useUIStore.getState();
      addToast({
        type: 'info',
        message: '🏠 Tifa returning to home base...',
      });

      return true;
    } catch (error) {
      console.error('[WS Store] Failed to return to home base:', error);

      const { addToast } = useUIStore.getState();
      addToast({
        type: 'error',
        message: '❌ Failed to send return home command',
      });

      return false;
    }
  },

  /**
   * Add alert message
   */
  addAlert: (type, message) => {
    set((state) => ({
      alerts: [
        ...state.alerts,
        {
          id: Date.now(),
          type, // 'success', 'error', 'warning', 'info'
          message,
          timestamp: Date.now(),
        },
      ],
    }));

    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        alerts: state.alerts.filter(alert => alert.timestamp !== Date.now()),
      }));
    }, 5000);
  },

  /**
   * Remove alert
   */
  removeAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.filter(alert => alert.id !== id),
    }));
  },

  /**
   * Clear all alerts
   */
  clearAlerts: () => {
    set({ alerts: [] });
  },

  /**
   * Handle EXPRESSION message with multiple types:
   * - EXPRESSION: Visual face expression (happy, sad, wink, etc.)
   * - SOUND: Play audio (base64, PCM, or PCM streaming)
   * - SOUND_STREAM_START: Start PCM streaming session
   * - SOUND_STREAM_CHUNK: Add PCM chunk to stream
   * - SOUND_STREAM_END: End PCM streaming
   * - TTS: Text-to-speech
   * - LED: LED control (future)
   */
  handleExpression: async (data) => {
    const { addToast } = useUIStore.getState();
    const expressionType = data.expression_type?.toUpperCase() || 'EXPRESSION';

    console.log(`[Expression] Type: ${expressionType}, Message: ${data.message}`);

    switch (expressionType) {
      case 'EXPRESSION':
        // Visual face expression - navigate to FaceExpression page
        addToast({
          type: 'info',
          message: `🤖 Expression: ${data.message || 'Unknown'}`,
        });

        const expressionName = data.message ? data.message.toLowerCase() : 'smile';
        get().triggerExpression(expressionName, data.message);

        // 🔊 Play default expression sound (configurable per expression in DB)
        audioService.playExpressionSound(expressionName);
        break;

      case 'SOUND':
        // Play audio from base64 data
        // Format: { expression_type: "SOUND", message: "base64data", format: "wav|mp3|pcm", ... }
        addToast({
          type: 'info',
          message: `🔊 Playing sound...`,
        });

        try {
          const format = data.format?.toLowerCase() || 'wav';

          if (format === 'pcm') {
            // Raw PCM audio
            await audioService.playPCMAudio(
              data.message,
              data.sample_rate || 16000,
              data.channels || 1,
              data.bit_depth || 16
            );
          } else {
            // Encoded audio (wav, mp3, ogg, etc.)
            const mimeType = `audio/${format}`;
            await audioService.playBase64Audio(data.message, mimeType);
          }
        } catch (error) {
          console.error('[Expression] Failed to play sound:', error);
          addToast({
            type: 'error',
            message: '❌ Failed to play sound',
          });
        }
        break;

      case 'SOUND_STREAM_START':
        // Start PCM streaming session
        // Format: { expression_type: "SOUND_STREAM_START", stream_id: "xxx", sample_rate: 16000, channels: 1, bit_depth: 16 }
        addToast({
          type: 'info',
          message: `🎵 Starting audio stream...`,
        });

        audioService.startPCMStream(
          data.stream_id || `stream_${Date.now()}`,
          data.sample_rate || 16000,
          data.channels || 1,
          data.bit_depth || 16
        );
        break;

      case 'SOUND_STREAM_CHUNK':
        // Add PCM chunk to stream
        // Format: { expression_type: "SOUND_STREAM_CHUNK", stream_id: "xxx", chunk: "base64data", index: 0, is_last: false }
        await audioService.addPCMChunk(
          data.stream_id,
          data.chunk || data.message,
          data.index || 0,
          data.is_last || false
        );
        break;

      case 'SOUND_STREAM_END':
        // End PCM streaming (cleanup)
        // Format: { expression_type: "SOUND_STREAM_END", stream_id: "xxx" }
        audioService.stopPCMStream();
        addToast({
          type: 'success',
          message: `✅ Audio stream completed`,
        });
        break;

      case 'TTS':
        // Text-to-speech
        // Format: { expression_type: "TTS", message: "Hello world", lang: "en-US" }
        addToast({
          type: 'info',
          message: `🗣️ Speaking: "${data.message?.substring(0, 30)}${data.message?.length > 30 ? '...' : ''}"`,
        });

        audioService.speak(data.message || '', data.lang || 'en-US');
        break;

      case 'SOUND_WITH_EXPRESSION':
        // Play sound AND show expression simultaneously
        // Format: { expression_type: "SOUND_WITH_EXPRESSION", message: "base64data", format: "wav", expression: "happy" }
        addToast({
          type: 'info',
          message: `🤖🔊 Expression + Sound`,
        });

        // Trigger visual expression
        if (data.expression) {
          get().triggerExpression(data.expression.toLowerCase(), data.expression);
        }

        // Play sound
        try {
          const soundFormat = data.format?.toLowerCase() || 'wav';
          if (soundFormat === 'pcm') {
            await audioService.playPCMAudio(
              data.message,
              data.sample_rate || 16000,
              data.channels || 1,
              data.bit_depth || 16
            );
          } else {
            await audioService.playBase64Audio(data.message, `audio/${soundFormat}`);
          }
        } catch (error) {
          console.error('[Expression] Failed to play sound with expression:', error);
        }
        break;

      case 'LED':
        // LED control (placeholder for future implementation)
        addToast({
          type: 'info',
          message: `💡 LED: ${data.message}`,
        });
        // TODO: Implement LED control via native plugin
        break;

      default:
        // Unknown type - treat as visual expression
        addToast({
          type: 'info',
          message: `🤖 ${expressionType}: ${data.message || 'Unknown'}`,
        });
        get().triggerExpression(expressionType.toLowerCase(), data.message);

        // 🔊 Play default expression sound (handles expression_type sent directly, e.g. "smile", "happy")
        audioService.playExpressionSound(expressionType.toLowerCase());
        break;
    }
  },

  /**
   * Trigger robot expression (navigate to FaceExpression page)
   */
  triggerExpression: (expressionType, message) => {
    const newExpression = {
      type: expressionType,
      message: message || '',
      timestamp: Date.now(),
    };

    // Force new reference by clearing first, then setting
    set({ currentExpression: null });

    // Use setTimeout to ensure React processes the null state first
    setTimeout(() => {
      set({ currentExpression: { ...newExpression } });
    }, 0);
  },

  /**
   * Clear current expression
   */
  clearExpression: () => {
    set({ currentExpression: null });
  },

  clearRobotError: () => {
    set({ robotError: null });
  },

  /**
   * Set home base coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} yaw - Yaw orientation in radians
   */
  setHomeBase: async (x, y, yaw) => {
    try {


      // Update home base in IndexedDB
      const homeBaseDestination = await db.destinations
        .where('is_home')
        .equals(1)
        .first();

      if (homeBaseDestination) {
        await db.destinations.update(homeBaseDestination.destination_id, {
          x,
          y,
          yaw,
        });
      }

      // Update state
      set({
        homeBase: { x, y, yaw }
      });

      const { addToast } = useUIStore.getState();
      addToast({
        type: 'success',
        message: '✅ Home base successfully updated',
      });
    } catch (error) {
      console.error('[WS Store] Failed to update home base:', error);

      const { addToast } = useUIStore.getState();
      addToast({
        type: 'error',
        message: '❌ Failed to update home base',
      });
    }
  },

  /**
   * Toggle auto-return to home base
   * @param {boolean} enabled - Enable/disable auto-return
   */
  setShouldReturnHome: (enabled) => {
    set({ shouldReturnHome: enabled });
  },

  /**
   * Send INTERRUPT to request cancellation
   */
  sendInterrupt: () => {
    const { settings } = useSettingsStore.getState();
    const robotId = settings?.robot_id;

    if (!robotId) {
      console.error('[WS Store] ❌ No robot_id configured!');
      return false;
    }

    try {
      commManager.sendInterrupt(robotId);

      // Show confirmation dialog
      const { openConfirmDialog, hideDeliveryInProgress } = useUIStore.getState();
      openConfirmDialog(
        "Cancel Delivery?",
        "Are you sure you want to cancel the ongoing delivery?",
        () => {
          // User confirmed - send INTERRUPT_CONFIRM
          get().sendInterruptConfirm();
          hideDeliveryInProgress();
        },
        () => {
          // User cancelled - send INTERRUPT_CANCEL
          get().sendInterruptCancel();
        }
      );

      return true;
    } catch (error) {
      console.error('[WS Store] Failed to send INTERRUPT:', error);
      return false;
    }
  },

  /**
   * Send INTERRUPT_CONFIRM to cancel the delivery
   */
  sendInterruptConfirm: () => {
    const { settings } = useSettingsStore.getState();
    const robotId = settings?.robot_id;

    try {
      commManager.sendInterruptConfirm(robotId);

      // Show toast
      const { addToast } = useUIStore.getState();
      addToast({
        type: 'warning',
        message: '⚠️ Delivery cancelled',
      });

      // Clear active delivery
      set({ activeDelivery: null, completedGoals: [] });

      return true;
    } catch (error) {
      console.error('[WS Store] Failed to send INTERRUPT_CONFIRM:', error);
      return false;
    }
  },

  /**
   * Send INTERRUPT_CANCEL to continue the delivery
   */
  sendInterruptCancel: () => {
    const { settings } = useSettingsStore.getState();
    const robotId = settings?.robot_id;

    try {
      commManager.sendInterruptCancel(robotId);

      // Show toast
      const { addToast } = useUIStore.getState();
      addToast({
        type: 'info',
        message: '▶️ Delivery continued',
      });

      return true;
    } catch (error) {
      console.error('[WS Store] Failed to send INTERRUPT_CANCEL:', error);
      return false;
    }
  },

  /**
   * Send ARRIVAL_CONFIRM when robot arrives and user confirms pickup
   */
  sendArrivalConfirm: () => {
    const { settings } = useSettingsStore.getState();
    const robotId = settings?.robot_id;

    try {
      commManager.sendArrivalConfirm(robotId);
      return true;
    } catch (error) {
      console.error('[WS Store] Failed to send ARRIVAL_CONFIRM:', error);
      return false;
    }
  },

  /**
   * Send ARRIVAL_CANCEL when robot arrives but user cancels
   */
  sendArrivalCancel: () => {
    const { settings } = useSettingsStore.getState();
    const robotId = settings?.robot_id;

    try {
      commManager.sendArrivalCancel(robotId);
      return true;
    } catch (error) {
      console.error('[WS Store] Failed to send ARRIVAL_CANCEL:', error);
      return false;
    }
  },

  /**
   * Load home base from IndexedDB
   */
  loadHomeBase: async () => {
    try {


      // Find home base destination (is_home = 1)
      const homeBaseDestination = await db.destinations
        .where('is_home')
        .equals(1)
        .first();

      if (homeBaseDestination) {
        set({
          homeBase: {
            x: homeBaseDestination.x,
            y: homeBaseDestination.y,
            yaw: homeBaseDestination.yaw,
          }
        });
      } else {
        // Fallback to default if not found
        set({
          homeBase: { x: 0, y: 0, yaw: 0 }
        });
      }
    } catch (error) {
      console.error('[WS Store] Failed to load home base from IndexedDB:', error);
      // Fallback to default
      set({
        homeBase: { x: 0, y: 0, yaw: 0 }
      });
    }
  },

  /**
   * Load battery state from IndexedDB
   */
  loadBatteryState: async () => {
    try {


      // Load last known battery state
      const batteryState = await db.robot_state.get('battery');

      if (batteryState) {
        set({
          robotBattery: {
            battery_level: batteryState.battery_level,
            battery_percent: batteryState.battery_percent,
            voltage: batteryState.voltage,
            robot_id: batteryState.robot_id,
            ui_id: batteryState.ui_id,
            timestamp: batteryState.timestamp
          }
        });
      }
    } catch (error) {
      console.error('[WS Store] Failed to load battery state from IndexedDB:', error);
    }
  },

  /**
   * Handle ERROR message from robot
   * error_code: LOW_BATTERY, MOTOR_FAIL, SENSOR_ERROR, etc.
   * severity: LOW / MEDIUM / HIGH / CRITICAL
   */
  handleRobotError: (data) => {
    const { addToast } = useUIStore.getState();
    const { openConfirmDialog } = useUIStore.getState();

    // Handle both old (error_code/error_message) and new (error/message) field names
    const errorCode = data.error_code || data.error || 'UNKNOWN_ERROR';
    const errorMessage = data.error_message || data.message || 'An unknown error occurred';
    const severity = data.severity || (errorCode === 'DUPLICATE_UI_ID' ? 'HIGH' : 'MEDIUM');

    const errorData = {
      error_code: errorCode,
      error_message: errorMessage,
      severity: severity,
      timestamp: Date.now(),
    };

    // Add to error history
    set((state) => ({
      robotError: errorData,
      robotErrors: [...state.robotErrors, errorData].slice(-20), // Keep last 20 errors
    }));

    console.log(`[Robot Error] ${errorCode}: ${errorMessage} (${severity})`);

    // Map severity to toast type
    const severityMap = {
      'LOW': { type: 'warning', icon: '⚠️' },
      'MEDIUM': { type: 'warning', icon: '⚠️' },
      'HIGH': { type: 'error', icon: '❌' },
      'CRITICAL': { type: 'error', icon: '🚨' },
    };

    const severityInfo = severityMap[severity?.toUpperCase()] || severityMap['HIGH'];

    // Show toast
    addToast({
      type: severityInfo.type,
      message: `${severityInfo.icon} Robot Error: ${errorCode} - ${errorMessage}`,
    });

    // For CRITICAL errors, show confirmation dialog
    if (severity?.toUpperCase() === 'CRITICAL') {
      openConfirmDialog(
        '🚨 Critical Error',
        `${errorMessage}\n\nDo you want to stop the current operation and return robot to home?`,
        () => {
          // User confirms - send INTERRUPT command
          get().sendInterrupt();
          addToast({
            type: 'info',
            message: '🔄 Sending interrupt command...',
          });
        },
        () => {
          // User cancels - continue
          addToast({
            type: 'info',
            message: '👍 Operation continues',
          });
        }
      );
    }
  },

  /**
   * Handle INIT message from robot
   * status: INITIALIZING, CHECKING_HARDWARE, CHECKING_SENSORS, READY, ERROR
   * init_message: e.g., "On Checking Motor", "Sensor Check Complete"
   */
  handleRobotInit: (data) => {
    const { addToast } = useUIStore.getState();

    const initStatus = data.status?.toUpperCase() || 'INITIALIZING';

    set({
      robotInit: {
        status: initStatus,
        init_message: data.init_message,
        timestamp: Date.now(),
      },
      isRobotInitializing: initStatus !== 'READY' && initStatus !== 'ERROR',
    });

    console.log(`[Robot Init] ${initStatus}: ${data.init_message}`);

    // Show progress toast for ongoing initialization
    if (initStatus === 'INITIALIZING' || initStatus === 'CHECKING_HARDWARE' || initStatus === 'CHECKING_SENSORS') {
      addToast({
        type: 'info',
        message: `🔧 ${data.init_message || 'Robot initializing...'}`,
      });
    } else if (initStatus === 'READY') {
      addToast({
        type: 'success',
        message: `✅ Robot ready!`,
      });
      set({ isRobotInitializing: false });
    } else if (initStatus === 'ERROR') {
      addToast({
        type: 'error',
        message: `❌ Initialization error: ${data.init_message}`,
      });
      set({ isRobotInitializing: false });
    }
  },

  /**
   * Update configuration
   */
  setConfig: (config) => {
    set(config);
  },
}));
