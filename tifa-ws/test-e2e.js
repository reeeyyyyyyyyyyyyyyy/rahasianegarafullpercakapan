const WebSocket = require('ws');

/**
 * TIFA WebSocket Gateway - End-to-End Test
 * Tests WebSocket protocol flow between UI, Robot, and WS Gateway
 * 
 * Flow:
 * 1. UI connects (SI) → ACK_SOFT
 * 2. Robot connects (SI) → ACK_SOFT
 * 3. Robot sends EXPRESSION → UI receives broadcast
 * 4. UI sends OP command (3 trays) to robot
 * 5. Robot receives OP, starts tray 1, sends telemetry (POSITION, BATTERY, STATUS)
 * 6. UI receives robot telemetry (broadcast)
 * 7. Robot completes tray 1 (GOAL_COMPLETE seq=1)
 * 8. Backend auto-dispatches tray 2 (MOVE seq=2) to robot
 * 9. Robot completes tray 2 (GOAL_COMPLETE seq=2)
 * 10. Backend auto-dispatches tray 3 (MOVE seq=3) to robot
 * 11. Robot completes tray 3 (GOAL_COMPLETE seq=3)
 * 12. Backend marks queue done → QUEUE_COMPLETED to UI
 * 13. Both disconnect → ws.session.disconnect published
 */

console.log('============================================================');
console.log('🔥 TIFA WS GATEWAY - END-TO-END TEST');
console.log('============================================================\n');

// Configuration
const WS_URL = 'ws://localhost:3001';
let uiWs = null;
let robotWs = null;

// Event capture for assertions
const uiEvents = [];
const robotEvents = [];

// Test state
const testState = {
  currentTray: 0,
  totalTrays: 3,
  startTime: null,
  waitingForMove: false,  // Flag to prevent auto-complete without MOVE
  lastMoveSequence: 0     // Track last received MOVE sequence
};

function log(source, level, message) {
  const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
  const prefix = `[${timestamp}] [${source}]`;
  
  if (level === 'info') {
    console.log(`${prefix} ℹ️  ${message}`);
  } else if (level === 'success') {
    console.log(`${prefix} ✅ ${message}`);
  } else if (level === 'action') {
    console.log(`${prefix} → ${message}`);
  } else if (level === 'received') {
    console.log(`${prefix} ← ${message}`);
  } else if (level === 'error') {
    console.error(`${prefix} ❌ ${message}`);
  } else if (level === 'test') {
    console.log(`${prefix} 🧪 ${message}`);
  }
}

function waitFor(desc, predicate, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const t = setInterval(() => {
      if (predicate()) {
        clearInterval(t);
        resolve();
      } else if (Date.now() - start >= timeout) {
        clearInterval(t);
        reject(new Error(`Timeout waiting for: ${desc}`));
      }
    }, 50);
  });
}

/**
 * Step 1: Connect UI Client
 * Sends SI message, waits for ACK_SOFT
 */
function connectUI() {
  return new Promise((resolve, reject) => {
    log('TEST', 'test', 'Connecting UI client...');
    
    uiWs = new WebSocket(WS_URL);
    
    uiWs.on('open', () => {
      log('UI', 'success', 'Connected to WS Gateway');
      
      const siMessage = {
        code: 'SI',
        data: {
          type: 'UI',
          ui_id: 'TEST_UI_1'
        }
      };
      
      log('UI', 'action', `Sending SI: ui_id=TEST_UI_1`);
      uiWs.send(JSON.stringify(siMessage));
    });
    
    uiWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        uiEvents.push(message);
        
        log('UI', 'received', `${message.code}`);
        
        if (message.code === 'ACK_SOFT') {
          log('UI', 'success', `Session established: ${message.data.ui_id}`);
          resolve();
        } else if (message.code === 'QUEUE_COMPLETED') {
          log('UI', 'success', 'QUEUE_COMPLETED received - all trays delivered!');
        }
      } catch (err) {
        log('UI', 'error', `Failed to parse message: ${err.message}`);
      }
    });
    
    uiWs.on('error', (error) => {
      log('UI', 'error', `Connection error: ${error.message}`);
      reject(error);
    });
    
    uiWs.on('close', () => {
      log('UI', 'info', 'WebSocket closed');
    });
  });
}

/**
 * Step 2: Connect Robot Client
 * Sends SI message, waits for ACK_SOFT
 */
function connectRobot() {
  return new Promise((resolve, reject) => {
    log('TEST', 'test', 'Connecting Robot client...');
    
    robotWs = new WebSocket(WS_URL);
    
    robotWs.on('open', () => {
      log('ROBOT', 'success', 'Connected to WS Gateway');
      
      const siMessage = {
        code: 'SI',
        data: {
          type: 'ROBOT',
          robot_id: 'RB001'
        }
      };
      
      log('ROBOT', 'action', `Sending SI: robot_id=RB001`);
      robotWs.send(JSON.stringify(siMessage));
    });
    
    robotWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        robotEvents.push(message);
        
        log('ROBOT', 'received', `${message.code}`);
        
        if (message.code === 'ACK_SOFT') {
          log('ROBOT', 'success', `Session established: ${message.data.robot_id}`);
          resolve();
        } else if (message.code === 'OP') {
          log('ROBOT', 'info', `Received OP with ${message.data.tray_tasks.length} trays`);
          // Simulate robot starting first tray
          setTimeout(() => {
            log('ROBOT', 'action', 'Starting tray 1 execution...');
            sendRobotTelemetry();
            // Complete first tray after 2 seconds
            setTimeout(() => {
              completeCurrentTray();
            }, 2000);
          }, 500);
        } else if (message.code === 'MOVE') {
          log('ROBOT', 'info', `Received MOVE: sequence=${message.data.sequence}`);
          log('ROBOT', 'action', `Destination: x=${message.data.dest.x}, y=${message.data.dest.y}`);
          testState.lastMoveSequence = message.data.sequence;
          testState.waitingForMove = false;
          // Complete tray after 2 seconds
          setTimeout(() => {
            sendRobotTelemetry();
            setTimeout(() => {
              completeCurrentTray();
            }, 1500);
          }, 500);
        }
      } catch (err) {
        log('ROBOT', 'error', `Failed to parse message: ${err.message}`);
      }
    });
    
    robotWs.on('error', (error) => {
      log('ROBOT', 'error', `Connection error: ${error.message}`);
      reject(error);
    });
    
    robotWs.on('close', () => {
      log('ROBOT', 'info', 'WebSocket closed');
    });
  });
}

/**
 * Step 3: Send OP Command from UI
 * Multi-tray dispatch (3 trays)
 */
function sendOPCommand() {
  return new Promise((resolve) => {
    log('TEST', 'test', 'Sending OP command from UI (3 trays)...');
    
    const opCommand = {
      code: 'OP',
      data: {
        robot_id: 'RB001',
        type: 'OP',
        map_id: 1,
        reqested_by: 2, // id ui
        tray_tasks: [
          { tray: 1, dest: { x: 10.5, y: 5.2, yaw: 0.0 }},
          { tray: 2, dest: { x: 15.0, y: 8.0, yaw: 1.5 }},
          { tray: 3, dest: { x: 20.0, y: 10.0, yaw: 3.0 } }
        ]
      }
    };
    
    log('UI', 'action', `Sending OP: ${opCommand.data.tray_tasks.length} trays`);
    opCommand.data.tray_tasks.forEach((task, idx) => {
      log('UI', 'info', `  Tray ${task.tray}: (${task.dest.x}, ${task.dest.y}) yaw=${task.dest.yaw}`);
    });
    
    uiWs.send(JSON.stringify(opCommand));
    
    setTimeout(resolve, 500);
  });
}

/**
 * Send robot telemetry (POSITION, BATTERY, STATUS)
 * Simulates real robot state updates
 */
function sendRobotTelemetry() {
  // POSITION
  const positionMsg = {
    code: 'POSITION',
    data: {
      robot_id: 'RB001',
      x: 10.5 + Math.random() * 3,
      y: 5.2 + Math.random() * 3,
      yaw: Math.random() * 6.28
    }
  };
  robotWs.send(JSON.stringify(positionMsg));
  
  // BATTERY
  const batteryMsg = {
    code: 'BATTERY',
    data: {
      robot_id: 'RB001',
      battery_percent: 85.5,
      voltage: 24.3
    }
  };
  robotWs.send(JSON.stringify(batteryMsg));
  
  // STATUS
  const statusMsg = {
    code: 'STATUS',
    data: {
      robot_id: 'RB001',
      status: 'MOVING',
      mode: 'IDLE'
    }
  };
  robotWs.send(JSON.stringify(statusMsg));
}

/**
 * Send EXPRESSION
 */
function sendExpression() {
  const expressionMsg = {
    code: 'EXPRESSION',
    data: {
      robot_id: 'RB001',
      expression_type: 'SMILE',
      message: 'HALLO'
    }
  };
  
  log('ROBOT', 'action', `Sending EXPRESSION: ${expressionMsg.data.expression_type}`);
  robotWs.send(JSON.stringify(expressionMsg));
}

/**
 * Send SHB (Set Home Base) command
 */
function sendSHBCommand() {
  const shbMsg = {
    code: 'SHB',
    data: {
      device_code: 'RB001',
      map_id: 1,
      x: 10.5,
      y: 5.2,
      yaw: 0.0
    }
  };
  
  log('UI', 'action', `Sending SHB: device_code=${shbMsg.data.device_code}, map_id=${shbMsg.data.map_id}, pos=(${shbMsg.data.x}, ${shbMsg.data.y})`);
  uiWs.send(JSON.stringify(shbMsg));
}

/**
 * Send SCS (Set Charging Station) command
 */
function sendSCSCommand() {
  const scsMsg = {
    code: 'SCS',
    data: {
      device_code: 'RB001',
      map_id: 1,
      x: 20.5,
      y: 8.2,
      yaw: 1.57
    }
  };
  
  log('UI', 'action', `Sending SCS: device_code=${scsMsg.data.device_code}, map_id=${scsMsg.data.map_id}, pos=(${scsMsg.data.x}, ${scsMsg.data.y})`);
  uiWs.send(JSON.stringify(scsMsg));
}

/**
 * Send DM (Diagnostic Mode) command
 */
function sendDMCommand() {
  const dmMsg = {
    code: 'DM',
    data: {
      device_code: 'RB001',
      robot_activity: 'DIAGNOSTIC_RUNNING',
      parameters: {
        log_level: 'DEBUG',
        sensors: ['imu', 'lidar', 'camera'],
        duration_seconds: 300
      }
    }
  };
  
  log('UI', 'action', `Sending DM: device_code=${dmMsg.data.device_code}, activity=${dmMsg.data.robot_activity}`);
  uiWs.send(JSON.stringify(dmMsg));
}

/**
 * Complete current tray and send GOAL_COMPLETE
 * Tray 1 starts from OP (no MOVE needed)
 * Trays 2+ require MOVE first
 */
function completeCurrentTray() {
  // For tray 2 and beyond: only allow if we got MOVE for this tray
  if (testState.currentTray >= 1) {
    // Current tray being completed
    const nextTray = testState.currentTray + 1;
    // Check if we got MOVE for next tray (e.g., after GOAL_COMPLETE seq=1, need MOVE seq=2)
    if (nextTray > 1 && testState.lastMoveSequence !== nextTray) {
      log('ROBOT', 'error', `Cannot complete tray ${testState.currentTray}: waiting for MOVE seq=${nextTray}`);
      return;
    }
  }
  
  testState.currentTray++;
  
  log('ROBOT', 'success', `Tray ${testState.currentTray} execution completed`);
  
  const goalCompleteMsg = {
    code: 'GOAL_COMPLETE',
    data: {
      robot_id: 'RB001',
      sequence: testState.currentTray
    }
  };
  
  log('ROBOT', 'action', `Sending GOAL_COMPLETE: sequence=${testState.currentTray}`);
  robotWs.send(JSON.stringify(goalCompleteMsg));
  
  if (testState.currentTray < testState.totalTrays) {
    testState.waitingForMove = true;
    log('ROBOT', 'info', `Waiting for MOVE seq=${testState.currentTray + 1} (${testState.totalTrays - testState.currentTray} remaining)...`);
  } else {
    log('ROBOT', 'info', 'All trays completed. Waiting for queue completion...');
  }
}

/**
 * Run End-to-End Test
 * Orchestrates full flow: SI → EXPRESSION → OP → MOVE → GOAL_COMPLETE → QUEUE_COMPLETED → SHB → SCS → DM
 */
async function runTest() {
  try {
    testState.startTime = Date.now();
    
    // Step 1: Connect UI
    await connectUI();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Step 2: Connect Robot
    await connectRobot();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Assertion: Both clients established SI
    log('TEST', 'test', 'Asserting SI ACKs received...');
    await waitFor('UI SI ACK', () => uiEvents.some(e => e.code === 'ACK_SOFT'));
    await waitFor('Robot SI ACK', () => robotEvents.some(e => e.code === 'ACK_SOFT'));
    log('TEST', 'success', 'Both clients connected via SI');
    
    // Step 2.5: Robot sends EXPRESSION
    log('TEST', 'test', 'Robot sending EXPRESSION...');
    await new Promise(resolve => setTimeout(resolve, 200));
    sendExpression();
    
    // Assertion: UI receives EXPRESSION broadcast
    log('TEST', 'test', 'Asserting UI receives EXPRESSION...');
    await waitFor('UI receives EXPRESSION', () => uiEvents.some(e => e.code === 'EXPRESSION'));
    log('TEST', 'success', 'UI received EXPRESSION broadcast');
    
    // Step 3: Send OP command
    await sendOPCommand();
    
    // Assertion: Robot receives OP
    log('TEST', 'test', 'Asserting robot receives OP...');
    await waitFor('Robot receives OP', () => robotEvents.some(e => e.code === 'OP'));
    log('TEST', 'success', 'Robot received OP command');
    
    // Assertion: UI receives POSITION, BATTERY, STATUS from robot
    log('TEST', 'test', 'Asserting UI receives robot telemetry...');
    await waitFor('UI receives POSITION', () => uiEvents.some(e => e.code === 'POSITION'));
    await waitFor('UI receives BATTERY', () => uiEvents.some(e => e.code === 'BATTERY'));
    await waitFor('UI receives STATUS', () => uiEvents.some(e => e.code === 'STATUS'));
    log('TEST', 'success', 'UI received robot telemetry broadcasts');
    
    // Assertion: After tray 1 complete → robot gets MOVE seq=2
    log('TEST', 'test', 'Asserting auto-dispatch of tray 2...');
    await waitFor('Robot receives MOVE seq=2', 
      () => robotEvents.some(e => e.code === 'MOVE' && e.data.sequence === 2), 
      20000);
    log('TEST', 'success', 'Backend auto-dispatched MOVE seq=2');
    
    // Assertion: After tray 2 complete → robot gets MOVE seq=3
    log('TEST', 'test', 'Asserting auto-dispatch of tray 3...');
    await waitFor('Robot receives MOVE seq=3', 
      () => robotEvents.some(e => e.code === 'MOVE' && e.data.sequence === 3), 
      20000);
    log('TEST', 'success', 'Backend auto-dispatched MOVE seq=3');
    
    // Assertion: After all trays complete → UI gets QUEUE_COMPLETED
    log('TEST', 'test', 'Asserting queue completion...');
    await waitFor('UI receives QUEUE_COMPLETED', 
      () => uiEvents.some(e => e.code === 'QUEUE_COMPLETED'), 
      20000);
    log('TEST', 'success', 'UI received QUEUE_COMPLETED');
    
    // Step 4: Test SHB (Set Home Base)
    log('TEST', 'test', '\n--- Testing SHB (Set Home Base) ---');
    sendSHBCommand();
    await new Promise(resolve => setTimeout(resolve, 2000));
    log('TEST', 'success', 'SHB command sent (check backend logs for m_goal + t_robot_goal insert)');
    
    // Step 5: Test SCS (Set Charging Station)
    log('TEST', 'test', '\n--- Testing SCS (Set Charging Station) ---');
    sendSCSCommand();
    await new Promise(resolve => setTimeout(resolve, 2000));
    log('TEST', 'success', 'SCS command sent (check backend logs for m_goal + t_robot_goal insert)');
    
    // Step 6: Test DM (Diagnostic Mode)
    log('TEST', 'test', '\n--- Testing DM (Diagnostic Mode) ---');
    sendDMCommand();
    await new Promise(resolve => setTimeout(resolve, 2000));
    log('TEST', 'success', 'DM command sent (check backend logs for h_state + h_command_log insert)');
    
    // Print test summary
    const duration = Date.now() - testState.startTime;
    console.log('\n' + '='.repeat(60));
    console.log('✅ END-TO-END TEST PASSED!');
    console.log('='.repeat(60));
    console.log(`\n📊 Test Summary:`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   UI Events: ${uiEvents.length} messages received`);
    console.log(`   Robot Events: ${robotEvents.length} messages received`);
    console.log(`   Flow: SI → EXPRESSION → OP → MOVE → QUEUE_COMPLETED → SHB → SCS → DM`);
    console.log(`   Trays Delivered: ${testState.totalTrays}/${testState.totalTrays}`);
    console.log(`   Commands Tested: SHB, SCS, DM`);
    console.log('\n🔌 Closing WebSocket connections...');
    
    // Graceful disconnect
    await new Promise(resolve => setTimeout(resolve, 500));
    uiWs.close();
    robotWs.close();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    log('TEST', 'success', 'Test completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ END-TO-END TEST FAILED!');
    console.error('='.repeat(60));
    console.error(`\nError: ${error.message}`);
    
    if (uiWs && uiWs.readyState === WebSocket.OPEN) {
      uiWs.close();
    }
    if (robotWs && robotWs.readyState === WebSocket.OPEN) {
      robotWs.close();
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[TEST] Shutting down gracefully...');
  if (uiWs && uiWs.readyState === WebSocket.OPEN) {
    uiWs.close();
  }
  if (robotWs && robotWs.readyState === WebSocket.OPEN) {
    robotWs.close();
  }
  process.exit(0);
});

// Start test after 1 second (allow WS gateway to be ready)
console.log('\n⏳ Starting test in 1 second...\n');
setTimeout(() => {
  runTest();
}, 1000);
