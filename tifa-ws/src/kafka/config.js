const { Kafka, Partitioners } = require('kafkajs');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Kafka Configuration
 * All topics used in TIFA system
 */
const TOPICS = {
  // UI Commands
  UI_COMMAND_MOVE: 'ui.command.move',
  UI_COMMAND_OP: 'ui.command.op',
  UI_COMMAND_MODE: 'ui.command.mode',
  UI_COMMAND_SHB: 'ui.command.shb',
  UI_COMMAND_DM: 'ui.command.dm',
  UI_COMMAND_SCS: 'ui.command.scs',

  // Robot State
  ROBOT_STATE_POSITION: 'robot.state.position',
  ROBOT_STATE_BATTERY: 'robot.state.battery',
  ROBOT_STATE_STATUS: 'robot.state.status',

  // Robot Events
  ROBOT_EVENT_GOAL_COMPLETE: 'robot.events.goal_complete',
  ROBOT_EVENT_MAPPING_COMPLETE: 'robot.events.mapping_complete',
  ROBOT_EVENT_ROBOT_STUCK: 'robot.events.robot_stuck',
  ROBOT_EVENT_EMERGENCY_STOP: 'robot.events.emergency_stop',
  ROBOT_EVENT_EXPRESSION: 'robot.events.expression',

  // Robot Command ACK
  ROBOT_COMMAND_ACK: 'robot.command.ack',

  // WS Traffic Audit
  WS_TRAFFIC_IN: 'ws.traffic.in',
  WS_TRAFFIC_OUT: 'ws.traffic.out',

  // Catch-all for unmapped codes (ensures ALL messages reach Kafka)
  WS_MISC_UI: 'ws.misc.ui',
  WS_MISC_ROBOT: 'ws.misc.robot',

  // Map management
  UI_COMMAND_MAP_SELECTED: 'ui.command.map_selected',

  // Delivery lifecycle (UI → Robot)
  UI_COMMAND_PICKUP_CONFIRM: 'ui.command.pickup_confirm',
  UI_COMMAND_PICKUP_CANCEL: 'ui.command.pickup_cancel',
  UI_COMMAND_INTERRUPT: 'ui.command.interrupt',
  UI_COMMAND_INTERRUPT_CONFIRM: 'ui.command.interrupt_confirm',
  UI_COMMAND_INTERRUPT_CANCEL: 'ui.command.interrupt_cancel',
  UI_COMMAND_ARRIVAL_CONFIRM: 'ui.command.arrival_confirm',
  UI_COMMAND_ARRIVAL_CANCEL: 'ui.command.arrival_cancel',

  // Speed control
  UI_COMMAND_SPEED: 'ui.command.speed',

  // Robot events (missing from original)
  ROBOT_EVENT_MOVE_COMPLETED: 'robot.events.move_completed',
  ROBOT_EVENT_INIT: 'robot.events.init',

  // Backend to WS
  BE_COMMAND_DISPATCH_NEXT_TRAY: 'be.command.dispatch_next_tray',
  BE_QUEUE_COMPLETED: 'be.queue.completed'
};

/**
 * Kafka instance
 */
const kafka = new Kafka({
  clientId: config.KAFKA_CLIENT_ID,
  brokers: config.KAFKA_BROKERS,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

module.exports = {
  kafka,
  TOPICS
};
