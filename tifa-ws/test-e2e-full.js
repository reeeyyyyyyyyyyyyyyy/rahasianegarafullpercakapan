const WebSocket = require('ws');

/**
 * TIFA WebSocket Gateway - Full End-to-End Test
 * Tests the complete WebSocket protocol including new lifecycle events
 */

console.log('============================================================');
console.log('🔥 TIFA WS GATEWAY - FULL END-TO-END TEST (INC. NEW CODES)');
console.log('============================================================\n');

// Configuration
const WS_URL = 'ws://localhost:3001';
let uiWs = null;
let robotWs = null;

// Event capture for assertions
const uiEvents = [];
const robotEvents = [];

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

function connectUI() {
  return new Promise((resolve, reject) => {
    uiWs = new WebSocket(WS_URL);
    uiWs.on('open', () => {
      uiWs.send(JSON.stringify({ code: 'SI', data: { type: 'UI', ui_id: 'TEST_UI_FULL' }}));
    });
    uiWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      uiEvents.push(msg);
      log('UI', 'received', `${msg.code}`);
      if (msg.code === 'ACK_SOFT') resolve();
    });
    uiWs.on('error', reject);
  });
}

function connectRobot() {
  return new Promise((resolve, reject) => {
    robotWs = new WebSocket(WS_URL);
    robotWs.on('open', () => {
      robotWs.send(JSON.stringify({ code: 'SI', data: { type: 'ROBOT', robot_id: 'RB_FULL' }}));
    });
    robotWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      robotEvents.push(msg);
      log('ROBOT', 'received', `${msg.code}`);
      if (msg.code === 'ACK_SOFT') resolve();
    });
    robotWs.on('error', reject);
  });
}

function sendCommand(ws, code, data, role) {
    const msg = { code, data };
    log(role, 'action', `Sending ${code}`);
    ws.send(JSON.stringify(msg));
}

async function runTest() {
  try {
    log('TEST', 'test', 'Connecting clients...');
    await connectUI();
    await connectRobot();
    log('TEST', 'success', 'Both clients connected via SI');

    // Test 1: Robot INIT
    log('TEST', 'test', '\n--- Testing INIT (Robot -> UI) ---');
    sendCommand(robotWs, 'INIT', { robot_id: 'RB_FULL', status: 'CHECKING_SENSORS', init_message: 'Sensors OK' }, 'ROBOT');
    await waitFor('UI receives INIT', () => uiEvents.some(e => e.code === 'INIT'));
    log('TEST', 'success', 'INIT passed');

    // Test 2: SPEED
    log('TEST', 'test', '\n--- Testing SPEED (UI -> Robot) ---');
    sendCommand(uiWs, 'SPEED', { robot_id: 'RB_FULL', speed: 0.8 }, 'UI');
    await waitFor('Robot receives SPEED', () => robotEvents.some(e => e.code === 'SPEED'));
    log('TEST', 'success', 'SPEED passed');

    // Test 3: MAP_SELECTED
    log('TEST', 'test', '\n--- Testing MAP_SELECTED (UI -> Robot) ---');
    sendCommand(uiWs, 'MAP_SELECTED', { robot_id: 'RB_FULL', map_id: 123 }, 'UI');
    await waitFor('Robot receives MAP_SELECTED', () => robotEvents.some(e => e.code === 'MAP_SELECTED'));
    log('TEST', 'success', 'MAP_SELECTED passed');

    // Test 4: PICKUP_CONFIRM
    log('TEST', 'test', '\n--- Testing PICKUP_CONFIRM (UI -> Robot) ---');
    sendCommand(uiWs, 'PICKUP_CONFIRM', { robot_id: 'RB_FULL' }, 'UI');
    await waitFor('Robot receives PICKUP_CONFIRM', () => robotEvents.some(e => e.code === 'PICKUP_CONFIRM'));
    log('TEST', 'success', 'PICKUP_CONFIRM passed');

    // Test 5: INTERRUPT flow
    log('TEST', 'test', '\n--- Testing INTERRUPT Flow (UI -> Robot) ---');
    sendCommand(uiWs, 'INTERRUPT', { robot_id: 'RB_FULL' }, 'UI');
    await waitFor('Robot receives INTERRUPT', () => robotEvents.some(e => e.code === 'INTERRUPT'));
    
    sendCommand(uiWs, 'INTERRUPT_CONFIRM', { robot_id: 'RB_FULL' }, 'UI');
    await waitFor('Robot receives INTERRUPT_CONFIRM', () => robotEvents.some(e => e.code === 'INTERRUPT_CONFIRM'));
    log('TEST', 'success', 'INTERRUPT flow passed');

    // Test 6: MOVE_COMPLETED + ARRIVAL_CONFIRM flow
    log('TEST', 'test', '\n--- Testing MOVE_COMPLETED Flow (Robot -> UI) ---');
    sendCommand(robotWs, 'MOVE_COMPLETED', { robot_id: 'RB_FULL', ui_id: 'TEST_UI_FULL', sequence: 1 }, 'ROBOT');
    await waitFor('UI receives MOVE_COMPLETED', () => uiEvents.some(e => e.code === 'MOVE_COMPLETED'));
    
    sendCommand(uiWs, 'ARRIVAL_CONFIRM', { robot_id: 'RB_FULL' }, 'UI');
    await waitFor('Robot receives ARRIVAL_CONFIRM', () => robotEvents.some(e => e.code === 'ARRIVAL_CONFIRM'));
    log('TEST', 'success', 'MOVE_COMPLETED flow passed');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL NEW MESSAGE CODE FLOWS VERIFIED SUCCESSFUL!');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

setTimeout(runTest, 1000);
