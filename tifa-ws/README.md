# TIFA WebSocket Gateway (v3)

**TIFA Robot Delivery Platform — WebSocket communication layer** for real-time bidirectional messaging between UI clients, robots, and the backend Spring Boot application.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Message Protocol](#message-protocol)
   - [SI (Session Identify)](#si-session-identify)
   - [UI Commands](#ui-commands)
   - [Robot State & Events](#robot-state--events)
   - [Error Messages](#error-messages)
5. [Message Payloads](#message-payloads)
6. [Kafka Integration](#kafka-integration)
7. [History & Audit Logging](#history--audit-logging)
8. [E2E Testing](#e2e-testing)
9. [Development](#development)

---

## Overview

The WS Gateway provides a **stateful WebSocket server** that:

- ✅ Routes messages between UI clients and robots in real-time
- ✅ Validates all inbound messages (SI, commands, state, events)
- ✅ Produces messages to Kafka for backend processing and audit trails
- ✅ Maintains session state (UI and robot connections)
- ✅ Logs all traffic to `h_ws_traffic` and connection events to `h_connection_log`
- ✅ Uses **natural keys** (robot_id, ui_id) — no internal queue_id exposure to clients
- ✅ **Smart routing**: Targeted delivery to specific UIs or broadcast to all UIs

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   WebSocket Gateway (Node.js)                │
├──────────────┬──────────────┬────────────┬──────────────────┤
│   Router     │   Session    │   Validator│   Kafka Producer │
│              │   Manager    │            │                  │
└──────────────┴──────────────┴────────────┴──────────────────┘
        ↑              ↓              ↑              ↓
   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐
   │   UI (WS)  │  │  Robot(WS) │  │ Validators │  │    Kafka    │
   └────────────┘  └────────────┘  └────────────┘  └─────────────┘
        ↓              ↓                              ↓
   ┌───────────────────────────────────────────────────────────┐
   │  Backend Spring Boot (Kafka Consumers)                   │
   │  - UICommandConsumer → t_goal_queue / h_command_log      │
   │  - RobotStateConsumer → h_position / h_battery / h_state │
   │  - RobotEventConsumer → queue dispatch / h_command_log   │
   │  - ConnectionLogConsumer → h_connection_log              │
   └───────────────────────────────────────────────────────────┘
```

### Message Flow

**UI → Robot (Command):**
1. UI sends command (e.g., MOVE) with `robot_id`
2. Gateway **injects `ui_id`** automatically into data
3. Gateway forwards to robot with enriched data
4. Robot receives command with both `robot_id` and `ui_id`

**Robot → UI (Response):**
1. Robot sends response with `ui_id` (from command)
2. Gateway checks if `ui_id` exists:
   - **Yes** → Sends ONLY to that specific UI (targeted)
   - **No** → Broadcasts to ALL connected UIs (broadcast)

**Use Cases:**
- **Targeted**: ACK, GOAL_COMPLETE, ROBOT_STUCK → reply to command sender
- **Broadcast**: POSITION, BATTERY, STATUS → all UIs monitor robot state

---

## Getting Started

### Prerequisites

- **Node.js** 16+
- **npm**
- **Kafka** 3.0+ (for message brokering)
- **PostgreSQL** 12+ (for backend state and history)

### Installation

```bash
cd tifa-ws
npm install
```

### Environment

Create or update `.env`:

```dotenv
# WebSocket
WS_HOST=0.0.0.0
WS_PORT=3001

# Kafka
KAFKA_BROKER=localhost:9092

# Logging
LOG_LEVEL=info
```

### Run

**Development (with nodemon):**
```bash
npm start
```

**Production:**
```bash
node src/index.js
```

The gateway starts on `ws://localhost:3001`.

---

## Message Protocol

### SI (Session Identify)

**Purpose:** Establish a session (UI or Robot).

**Sent by:** UI client or Robot.

**Format:**

```json
{
  "code": "SI",
  "data": {
    "type": "UI",
    "ui_id": "UI_CLIENT_1"
  }
}
```

Or for robot:

```json
{
  "code": "SI",
  "data": {
    "type": "ROBOT",
    "robot_id": "RB001"
  }
}
```

**Response (ACK_SOFT):**

```json
{
  "code": "ACK_SOFT",
  "data": {
    "ui_id": "UI_CLIENT_1",
    "message": "UI session established",
    "timestamp": "2025-11-28T10:30:00Z"
  }
}
```

**Backend Actions:**
- SessionManager stores the session.
- Router publishes `ws.session.connect` to Kafka.
- ConnectionLogConsumer inserts to `h_connection_log` and audits to `h_ws_traffic`.

---

### UI Commands

UI clients send commands to robots via the gateway.

#### OP (Operation / Multi-Tray Dispatch)

**Purpose:** Assign multiple trays to a robot for delivery.

**Format:**

```json
{
  "code": "OP",
  "data": {
    "robot_id": "RB001",
    "type": "OP",
    "map_id": 1,
    "reqested_by": 2,
    "tray_tasks": [
      {
        "tray": 1,
        "dest": {
          "x": 10.5,
          "y": 5.2,
          "yaw": 0.0
        },
        "goal_id": 101
      },
      {
        "tray": 2,
        "dest": {
          "x": 15.0,
          "y": 8.0,
          "yaw": 1.5
        },
        "goal_id": 102
      }
    ]
  }
}
```

**Field Notes:**
- `map_id`: Map identifier for navigation context.
- `reqested_by`: UI identifier (user/system that requested the operation).
- `goal_id`: Unique identifier for each delivery goal/tray.

**Backend Actions:**
- UICommandConsumer creates queue entries in `t_goal_queue` (one per tray).
- Logs to `h_command_log` and `h_ws_traffic`.
- Immediately routes MOVE for the first tray to robot.

---

#### MOVE (Single Tray Dispatch)

**Purpose:** Command robot to move to a specific location.

**Format (Sent by UI):**

```json
{
  "code": "MOVE",
  "data": {
    "robot_id": "RB001",
    "sequence": 1,
    "dest": {
      "x": 10.5,
      "y": 5.2,
      "yaw": 0.0
    },
    "home_base": {
      "x": 0.0,
      "y": 0.0,
      "yaw": 0.0
    },
    "type": "GREET"
  }
}
```

**Format (Received by Robot with ui_id injected):**

```json
{
  "code": "MOVE",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "sequence": 1,
    "dest": {
      "x": 10.5,
      "y": 5.2,
      "yaw": 0.0
    },
    "home_base": {
      "x": 0.0,
      "y": 0.0,
      "yaw": 0.0
    },
    "type": "GREET"
  }
}
```

**Field Notes:**
- `robot_id`: Target robot identifier (e.g., "RB001").
- `ui_id`: **Automatically injected by gateway** from the UI session that sent the command. Robot should include this in all response messages (ACK, GOAL_COMPLETE) for targeted delivery.
- `sequence`: 1-based counter identifying which tray/task (used to match GOAL_COMPLETE).
- `dest`: Destination coordinates `{x, y, yaw}` where robot should navigate.
- `home_base`: Home base coordinates `{x, y, yaw}` where robot should return after completing the task.
- `type`: **Optional**. Movement behavior type:
  - `"GREET"` - Greet & Guide mode (robot greets and guides customer to destination)
  - `"SPECIAL"` - Special delivery mode (robot delivers with music/celebration effects)
  - `"CHARGE"` - Return to charging station (sequence typically 999)
  - `"HOMEBASE"` - Return to home base position (sequence typically 999)
  - `null` or omitted - Normal delivery mode (standard tray delivery)

**Backend Actions:**
- Logs to `h_command_log` and `h_ws_traffic`.
- Optionally updates queue status.
- Robot uses `ui_id` to send responses (ACK, GOAL_COMPLETE) back to the specific UI that initiated the command.

---

#### MODE (Robot Mode Change)

**Purpose:** Set robot operational mode (IDLE, MOVING, MAPPING, CHARGING, PAUSED).

**Format:**

```json
{
  "code": "MODE",
  "data": {
    "robot_id": "RB001",
    "mode": "MOVING"
  }
}
```

**Backend Actions:**
- Logs to `h_command_log` (mode=MOVING).
- Updates `h_state` to reflect mode change.
- Validates state transition rules.

---

#### SHB (Set Home Base)

**Purpose:** Define the home base location for a specific robot.

**Format:**

```json
{
  "code": "SHB",
  "data": {
    "device_code": "RB001",
    "map_id": 1,
    "x": 10.5,
    "y": 5.2,
    "yaw": 0.0
  }
}
```

**Field Notes:**
- `device_code`: Robot identifier (e.g., "RB001") — backend will lookup `device_id` from `m_device`.
- `map_id`: Map identifier where the home base is located.
- `x`, `y`, `yaw`: Coordinates of the home base position.

**Backend Actions:**
- SHBConsumer receives message from `ui.command.shb` Kafka topic.
- Looks up `device_id` from `m_device` using `device_code`.
- Creates new goal entry in `m_goal` with `goal_type='HOME'`.
- Deletes any existing HOME mapping in `t_robot_goal` for this device.
- Inserts new mapping in `t_robot_goal` linking device to the new HOME goal.
- Logs to `h_command_log` with `command_code='SHB'`.

**Database Result:**
- New row in `m_goal` with goal coordinates.
- Updated `t_robot_goal` mapping (device → HOME goal).

---

#### SCS (Set Charging Station)

**Purpose:** Define the charging station location for a specific robot.

**Format:**

```json
{
  "code": "SCS",
  "data": {
    "device_code": "RB001",
    "map_id": 1,
    "x": 20.5,
    "y": 8.2,
    "yaw": 1.57
  }
}
```

**Field Notes:**
- `device_code`: Robot identifier — backend will lookup `device_id` from `m_device`.
- `map_id`: Map identifier where the charging station is located.
- `x`, `y`, `yaw`: Coordinates of the charging station position.

**Backend Actions:**
- SCSConsumer receives message from `ui.command.scs` Kafka topic.
- Looks up `device_id` from `m_device` using `device_code`.
- Creates new goal entry in `m_goal` with `goal_type='CHARGE'`.
- Deletes any existing CHARGE mapping in `t_robot_goal` for this device.
- Inserts new mapping in `t_robot_goal` linking device to the new CHARGE goal.
- Logs to `h_command_log` with `command_code='SCS'`.

**Database Result:**
- New row in `m_goal` with charging station coordinates.
- Updated `t_robot_goal` mapping (device → CHARGE goal).

---

#### DM (Diagnostic Mode)

**Purpose:** Enter diagnostic mode for troubleshooting and debugging.

**Format:**

```json
{
  "code": "DM",
  "data": {
    "device_code": "RB001",
    "robot_activity": "DIAGNOSTIC_RUNNING",
    "parameters": {
      "log_level": "DEBUG",
      "sensors": ["imu", "lidar", "camera"],
      "duration_seconds": 300
    }
  }
}
```

**Field Notes:**
- `device_code`: Robot identifier — backend will lookup `device_id` from `m_device`.
- `robot_activity`: Activity descriptor (e.g., "DIAGNOSTIC_RUNNING").
- `parameters`: Optional diagnostic parameters (log level, sensors to monitor, duration, etc.).

**Backend Actions:**
- DiagnosticConsumer receives message from `ui.command.dm` Kafka topic.
- Looks up `device_id` from `m_device` using `device_code`.
- Inserts into `h_state` with `robot_mode='DIAGNOSTIC'` and `robot_activity` from message.
- Inserts into `h_command_log` with `command_code='DIAGNOSTIC'` and `status='RUNNING'`.
- Full payload stored in both tables for audit trail.

**Database Result:**
- New row in `h_state` recording diagnostic mode entry.
- New row in `h_command_log` recording diagnostic command execution.

---

### Robot State & Events

Robots send state updates and event notifications.

**⚠️ Important: UI Targeting**

- **Targeted Messages**: If robot includes `ui_id` in data, message is sent **only to that specific UI**.
- **Broadcast Messages**: If `ui_id` is **not provided**, message is **broadcast to ALL connected UIs**.

**Use Cases:**
- **Targeted**: Command responses (ACK, GOAL_COMPLETE) → reply to the UI that sent the command
- **Broadcast**: State updates (POSITION, BATTERY, STATUS) → all UIs should see robot state

---

#### POSITION (Real-time Location)

**Purpose:** Report current coordinates and orientation.

**Format (Broadcast - no ui_id):**

```json
{
  "code": "POSITION",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "x": 10.5,
    "y": 5.2,
    "yaw": 0.785
  }
}
```

**Backend Actions:**
- RobotStateConsumer inserts to `h_position`.
- Audits to `h_ws_traffic`.
- **Broadcasts to ALL connected UI clients** (no ui_id provided).

---

#### BATTERY (Power & Voltage Status)

**Purpose:** Report battery level and voltage.

**Format (Broadcast - no ui_id):**

```json
{
  "code": "BATTERY",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "battery_level": 85.5,
    "battery_percent": 85.5,
    "voltage": 24.3
  }
}
```

**Schema Notes:**
- `battery_percent`: Stored in `h_battery.battery_percent`.
- `voltage`: Stored in `h_battery.voltage`.

**Backend Actions:**
- RobotStateConsumer inserts to `h_battery` (battery_percent, voltage).
- Audits to `h_ws_traffic`.
- **Broadcasts to ALL UIs** (no ui_id provided).

---

#### STATUS (Robot Activity/State)

**Purpose:** Report robot activity (IDLE, MOVING, ARRIVED, DOCKING, etc.).

**Format (Broadcast - no ui_id):**

```json
{
  "code": "STATUS",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "status": "MOVING"
  }
}
```

**Backend Actions:**
- RobotStateConsumer inserts to `h_state` with `robot_activity = MOVING`.
- Audits to `h_ws_traffic`.
- **Broadcasts to ALL UIs** (no ui_id provided).

---

#### GOAL_COMPLETE (Tray Delivery Completed)

**Purpose:** Notify backend that a tray has been delivered.

**Format (Targeted - with ui_id):**

```json
{
  "code": "GOAL_COMPLETE",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "sequence": 1
  }
}
```

**Notes:**
- `sequence` matches the MOVE sequence; backend uses (robot_id, sequence) to locate queue entry.
- `ui_id`: **Automatically injected by gateway** from the UI that sent the original command.
- No `queue_id` sent from edge; backend resolves internally.

**Backend Actions:**
- RobotEventConsumer marks queue entry complete.
- If more trays exist, publishes next MOVE dispatch to robot.
- If last tray, publishes QUEUE_COMPLETED to all UIs.
- Audits to `h_ws_traffic`.
- **Sent ONLY to UI_TIFA_001** (targeted delivery).

**UI Receives:**
```json
{
  "code": "GOAL_COMPLETE",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "sequence": 1
  }
}
```
Only the UI that initiated the delivery receives this confirmation.

---

#### MAPPING_COMPLETE (Map Building Finished)

**Purpose:** Notify that robot has completed map building.

**Format (Can be Targeted or Broadcast):**

```json
{
  "code": "MAPPING_COMPLETE",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "map_id": "MAP_20251128_001",
    "map_url": "s3://maps/MAP_20251128_001.pgm"
  }
}
```

**Backend Actions:**
- Logs event to `h_command_log` (event type MAPPING_COMPLETE).
- Audits to `h_ws_traffic`.
- If `ui_id` present → **Sent to specific UI**.
- If `ui_id` absent → **Broadcast to all UIs**.

---

#### ROBOT_STUCK (Obstacle / Navigation Issue)

**Purpose:** Alert that robot is stuck or unable to proceed.

**Format (Targeted - with ui_id):**

```json
{
  "code": "ROBOT_STUCK",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "sequence": 1,
    "reason": "OBSTACLE_DETECTED",
    "position": {
      "x": 10.5,
      "y": 5.2,
      "yaw": 0.785
    }
  }
}
```

**Backend Actions:**
- Logs alert to `h_command_log`.
- Audits to `h_ws_traffic`.
- If `ui_id` present → **Sent to specific UI** (the one that sent the command).
- If `ui_id` absent → **Broadcast to all UIs** for manual intervention.

---

#### EMERGENCY_STOP (Safety Trigger)

**Purpose:** Robot has triggered emergency stop.

**Format (Broadcast - critical alert):**

```json
{
  "code": "EMERGENCY_STOP",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "reason": "COLLISION_DETECTED",
    "timestamp": "2025-11-28T10:35:00Z"
  }
}
```

**Backend Actions:**
- Logs critical event to `h_command_log`.
- Audits to `h_ws_traffic`.
- **Broadcasts to ALL UIs** (high priority, no ui_id).
- Pauses any ongoing operations.

---

#### ACK (Command Acknowledgment)

**Purpose:** Robot acknowledges receipt of a command.

**Format (Targeted - with ui_id):**

```json
{
  "code": "ACK",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "command_id": "msg_123456",
    "status": "ACCEPTED"
  }
}
```

**Notes:**
- `ui_id`: **Automatically injected by gateway** from the UI that sent the command.

**Backend Actions:**
- Logs to `h_command_log`.
- Audits to `h_ws_traffic`.
- **Sent ONLY to the UI** that sent the command (targeted).

**UI Receives:**
```json
{
  "code": "ACK",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "command_id": "msg_123456",
    "status": "ACCEPTED"
  }
}
```

---

#### EXPRESSION (LED / Audio / Facial Expression)

**Purpose:** Robot executes a facial expression, displays LED patterns, or outputs audio messages.

**Format (Can be Targeted or Broadcast):**

```json
{
  "code": "EXPRESSION",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "expression_type": "EXPRESSION",
    "message": "smile"
  }
}
```

**Alternative Formats:**

```json
// LED Pattern
{
  "code": "EXPRESSION",
  "data": {
    "robot_id": "RB001",
    "expression_type": "LED",
    "message": "GREEN"
  }
}

// Text Display
{
  "code": "EXPRESSION",
  "data": {
    "robot_id": "RB001",
    "expression_type": "EXPRESSION",
    "message": "HALLO"
  }
}
```

**Field Notes:**
- `robot_id`: Robot identifier executing the expression.
- `ui_id`: **Optional**. If present → **sent to specific UI only** (targeted delivery). If absent → **broadcast to all UIs** for real-time monitoring.
- `expression_type`: Type of output to execute:
  - `"EXPRESSION"` - Facial expression or text message display on robot screen
  - `"LED"` - LED pattern/color display (e.g., "GREEN", "RED", "BLUE", "RAINBOW")
  - `"SOUND"` - Audio output (sound effects or voice)
- `message`: Content to display/execute:
  - **For EXPRESSION type**: Facial expressions (`"smile"`, `"happy"`, `"wink"`, `"sad"`, `"surprised"`) or text messages (`"HALLO"`, `"WELCOME"`, `"GOODBYE"`)
  - **For LED type**: Color or pattern names (`"GREEN"`, `"RED"`, `"BLUE"`, `"RAINBOW"`, `"BLINK"`)
  - **For SOUND type**: Sound effect names or voice phrases

**Backend Actions:**
- RobotExpressionConsumer inserts to `h_expression` (robot_id, expression_type, message, timestamp).
- Audits to `h_ws_traffic` for message tracking.
- **Delivery Behavior:**
  - If `ui_id` present → Sent to specific UI (targeted delivery to command initiator)
  - If `ui_id` absent → Broadcast to all connected UIs (for real-time display/monitoring)

**Examples:**

```json
// Smile expression - broadcast to all UIs
{
  "code": "EXPRESSION",
  "data": {
    "robot_id": "RB001",
    "expression_type": "EXPRESSION",
    "message": "smile"
  }
}

// Green LED - targeted to specific UI
{
  "code": "EXPRESSION",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "expression_type": "LED",
    "message": "GREEN"
  }
}

// Welcome message - broadcast
{
  "code": "EXPRESSION",
  "data": {
    "robot_id": "RB001",
    "expression_type": "EXPRESSION",
    "message": "WELCOME"
  }
}
```

---

#### INTERRUPT (Cancel Movement Request)

**Purpose:** UI requests robot to stop current movement. This initiates a cancel flow that requires user confirmation.

**Format (Sent by UI):**

```json
{
  "code": "INTERRUPT",
  "data": {
    "robot_id": "RB001"
  }
}
```

**Format (Received by Robot with ui_id injected):**

```json
{
  "code": "INTERRUPT",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001"
  }
}
```

**Field Notes:**
- `robot_id`: Target robot to interrupt.
- `ui_id`: **Automatically injected by gateway** from the UI session.

**UI Behavior:**
1. UI sends INTERRUPT when user taps screen during active delivery
2. UI shows confirmation dialog: "Are you sure you want to cancel?"
3. User confirms → UI sends `INTERRUPT_CONFIRM`
4. User cancels → UI sends `INTERRUPT_CANCEL`

**Backend Actions:**
- Logs to `h_command_log` with `command_code='INTERRUPT'`.
- Robot should pause/slow down movement while awaiting confirmation.
- Audits to `h_ws_traffic`.

---

#### INTERRUPT_CONFIRM (Confirm Cancel Movement)

**Purpose:** UI confirms the cancel request. Robot should stop movement and return to home base.

**Format (Sent by UI):**

```json
{
  "code": "INTERRUPT_CONFIRM",
  "data": {
    "robot_id": "RB001"
  }
}
```

**Format (Received by Robot with ui_id injected):**

```json
{
  "code": "INTERRUPT_CONFIRM",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001"
  }
}
```

**Field Notes:**
- `robot_id`: Target robot to confirm cancellation.
- `ui_id`: **Automatically injected by gateway**.

**Backend Actions:**
- Robot aborts current movement task.
- Clears active delivery queue.
- Robot navigates back to home base.
- Logs to `h_command_log` with `command_code='INTERRUPT_CONFIRM'` and `status='CANCELLED'`.
- UI clears active delivery state and returns to main menu.

---

#### INTERRUPT_CANCEL (Abort Cancel Request)

**Purpose:** UI aborts the cancel request. Robot should resume normal movement.

**Format (Sent by UI):**

```json
{
  "code": "INTERRUPT_CANCEL",
  "data": {
    "robot_id": "RB001"
  }
}
```

**Format (Received by Robot with ui_id injected):**

```json
{
  "code": "INTERRUPT_CANCEL",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001"
  }
}
```

**Field Notes:**
- `robot_id`: Target robot to resume operation.
- `ui_id`: **Automatically injected by gateway**.

**Backend Actions:**
- Robot resumes normal movement (continues to destination).
- Logs to `h_command_log` with `command_code='INTERRUPT_CANCEL'` and `status='RESUMED'`.
- UI closes cancel dialog and continues showing delivery status.

---

#### MOVE_COMPLETED (Robot Finished Movement)

**Purpose:** Robot notifies that it has physically arrived at the destination coordinates. This triggers the UI to show delivery confirmation overlay.

**Format (Targeted - with ui_id):**

```json
{
  "code": "MOVE_COMPLETED",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "sequence": 1
  }
}
```

**Field Notes:**
- `robot_id`: Robot that completed movement.
- `ui_id`: **From original MOVE command** - enables targeted delivery back to initiating UI.
- `sequence`: Matches the MOVE sequence to identify which tray/task completed.

**Backend Actions:**
- RobotEventConsumer logs to `h_command_log` with `command_code='MOVE_COMPLETED'`.
- **Sent ONLY to the UI** that initiated the command (targeted delivery).
- UI receives this and shows delivery confirmation overlay ("Please take your items").

**UI Behavior:**
1. UI receives `MOVE_COMPLETED`
2. UI shows delivery overlay with countdown/confirmation
3. Customer takes items from tray
4. UI sends `ARRIVAL` to notify robot that customer has taken items

---

#### ARRIVAL_CONFIRM (Confirm Items Picked Up)

**Purpose:** UI notifies robot that customer has confirmed taking items from the tray. This signals the robot to proceed with the next delivery or return home.

**Format (Sent by UI):**

```json
{
  "code": "ARRIVAL_CONFIRM",
  "data": {
    "robot_id": "RB001"
  }
}
```

**Format (Received by Robot with ui_id injected):**

```json
{
  "code": "ARRIVAL_CONFIRM",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "timestamp": "2025-11-28T10:30:00Z"
  }
}
```

**Field Notes:**
- `robot_id`: Target robot.
- `ui_id`: **Automatically injected by gateway**.
- `timestamp`: When the confirmation was sent.

**Backend Actions:**
- Logs to `h_command_log` with `command_code='ARRIVAL_CONFIRM'`.
- If more trays in queue → Backend dispatches next MOVE to robot.
- If last tray → Robot returns to home base, UI receives `QUEUE_COMPLETED`.
- Audits to `h_ws_traffic`.

---

#### ARRIVAL_CANCEL (Customer Declined / Items Not Taken)

**Purpose:** UI notifies robot that customer cancelled or didn't take items. Robot may return items or proceed with alternative action.

**Format (Sent by UI):**

```json
{
  "code": "ARRIVAL_CANCEL",
  "data": {
    "robot_id": "RB001"
  }
}
```

**Format (Received by Robot with ui_id injected):**

```json
{
  "code": "ARRIVAL_CANCEL",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "timestamp": "2025-11-28T10:30:00Z"
  }
}
```

**Field Notes:**
- `robot_id`: Target robot.
- `ui_id`: **Automatically injected by gateway**.
- `timestamp`: When the cancellation was sent.

**Backend Actions:**
- Logs to `h_command_log` with `command_code='ARRIVAL_CANCEL'` and `status='DECLINED'`.
- Robot may return to home base or proceed with next task based on configuration.
- UI shows confused expression (customer declined).
- Audits to `h_ws_traffic`.

**Flow Diagram:**

```
Robot arrives at destination
        ↓
Robot sends MOVE_COMPLETED
        ↓
UI shows "Please take items" overlay
        ↓
┌─────────────────────────────────────────┐
│ Customer Action:                         │
├─────────────────┬───────────────────────┤
│ Takes items     │ Declines / Timer out  │
│ (Confirm btn)   │ (Cancel btn / timeout)│
└────────┬────────┴───────────┬───────────┘
         ↓                    ↓
  UI sends               UI sends
  ARRIVAL_CONFIRM        ARRIVAL_CANCEL
         ↓                    ↓
  Backend checks:        Robot returns home
  - More trays?          or handles declined
    → Next MOVE
  - Last tray?
    → QUEUE_COMPLETED
```

---

### Interrupt Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERRUPT FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User taps screen during delivery                           │
│         ↓                                                   │
│  UI sends INTERRUPT to Robot                                │
│         ↓                                                   │
│  UI shows confirmation dialog                               │
│         ↓                                                   │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ User confirms   │    │ User cancels    │                │
│  │ "Yes, cancel"   │    │ "No, continue"  │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           ↓                      ↓                          │
│  UI sends                 UI sends                          │
│  INTERRUPT_CONFIRM        INTERRUPT_CANCEL                  │
│           ↓                      ↓                          │
│  Robot stops              Robot resumes                     │
│  Returns home             Normal delivery                   │
│           ↓                      ↓                          │
│  UI shows main menu       UI continues                      │
│                           delivery status                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Delivery Completion Flow

```
┌─────────────────────────────────────────────────────────────┐
│              DELIVERY COMPLETION FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Robot navigating to destination                            │
│         ↓                                                   │
│  Robot arrives at coordinates                               │
│         ↓                                                   │
│  Robot sends MOVE_COMPLETED (with ui_id, sequence)          │
│         ↓                                                   │
│  UI receives MOVE_COMPLETED (targeted)                      │
│         ↓                                                   │
│  UI shows delivery overlay:                                 │
│  "Your items have arrived! Please take them."               │
│         ↓                                                   │
│  ┌─────────────────────┬─────────────────────┐             │
│  │ Customer confirms   │ Customer declines   │             │
│  │ (takes items)       │ (timer expires)     │             │
│  └─────────┬───────────┴─────────┬───────────┘             │
│            ↓                     ↓                          │
│  UI sends                 UI sends                          │
│  ARRIVAL_CONFIRM          ARRIVAL_CANCEL                    │
│            ↓                     ↓                          │
│  Backend processes:       Robot returns home                │
│  ┌────────────────────┐   or handles declined               │
│  │ More trays?        │                                     │
│  │  → MOVE (next)     │                                     │
│  │ Last tray?         │                                     │
│  │  → QUEUE_COMPLETED │                                     │
│  └────────────────────┘                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Error Messages

**Format:**

```json
{
  "code": "ERROR",
  "data": {
    "message": "No active session. Send SI first.",
    "timestamp": "2025-11-28T10:30:00Z"
  }
}
```

**Sent when:**
- SI validation fails.
- Non-SI message without active session.
- Invalid message format.
- Kafka publish failure (logged but message sent to recipient if possible).

---

### Newly Added Message Codes

#### SPEED (Robot Speed Control)

**Purpose:** UI sets the max linear speed of the robot.

**Format (Sent by UI):**
```json
{
  "code": "SPEED",
  "data": {
    "robot_id": "RB001",
    "speed": 0.5
  }
}
```

#### INIT (Robot Initialization State)

**Purpose:** Robot notifies UI about its boot-up or hardware initialization sequence.

**Format (Broadcast by Robot):**
```json
{
  "code": "INIT",
  "data": {
    "robot_id": "RB001",
    "status": "CHECKING_SENSORS",
    "init_message": "Calibrating LiDAR mapping..."
  }
}
```

#### PICKUP_CONFIRM (Confirm Items Loaded)

**Purpose:** Kitchen staff confirms that dishes have been placed on the tray and robot can depart.

**Format (Sent by UI):**
```json
{
  "code": "PICKUP_CONFIRM",
  "data": {
    "robot_id": "RB001"
  }
}
```

#### PICKUP_CANCEL (Abort Delivery Dispatch)

**Purpose:** Kitchen staff decides to cancel the delivery dispatch before the robot departs.

**Format (Sent by UI):**
```json
{
  "code": "PICKUP_CANCEL",
  "data": {
    "robot_id": "RB001"
  }
}
```

#### MAP_SELECTED (Change Active Map)

**Purpose:** UI informs the backend/robot that a specific map is now active for navigation.

**Format (Sent by UI):**
```json
{
  "code": "MAP_SELECTED",
  "data": {
    "robot_id": "RB001",
    "map_id": 1
  }
}
```

#### MAP_DATA (Send Map Files)

**Purpose:** Directly transfer map raw data (PGM/YAML) to the robot (often via ADB mode when internet is down).

**Format (Sent by UI):**
```json
{
  "code": "MAP_DATA",
  "data": {
    "robot_id": "RB001",
    "map_id": 1,
    "payload": "base64_encoded_zip_or_binary",
    "filename": "map_1.zip"
  }
}
```

---

## Message Payloads

### Summary Table

| Code | Direction | Purpose | Key Fields |
|------|-----------|---------|-----------|
| **SI** | Both | Session establish | type, ui_id / robot_id |
| **OP** | UI → Robot | Multi-tray dispatch | robot_id, map_id, reqested_by, tray_tasks[] |
| **MOVE** | UI → Robot | Single tray move | robot_id, sequence, dest |
| **MODE** | UI → Robot | Mode change | robot_id, mode |
| **SHB** | UI → Robot | Set home base | robot_id, home_base |
| **DM** | UI → Robot | Diagnostic mode | robot_id, diagnostic_enabled |
| **SCS** | UI → Robot | Charge station loc | robot_id, station_location |
| **POSITION** | Robot → UI | Current location | robot_id, x, y, yaw |
| **BATTERY** | Robot → UI | Battery status | robot_id, battery_percent, voltage |
| **STATUS** | Robot → UI | Activity state | robot_id, status |
| **GOAL_COMPLETE** | Robot → UI | Tray delivered | robot_id, sequence |
| **MAPPING_COMPLETE** | Robot → UI | Map finished | robot_id, map_id, map_url |
| **ROBOT_STUCK** | Robot → UI | Navigation issue | robot_id, sequence, reason, position |
| **EMERGENCY_STOP** | Robot → UI | Safety trigger | robot_id, reason, timestamp |
| **ACK** | Robot → UI | Command ACK | robot_id, command_id, status |
| **EXPRESSION** | Robot → UI | Expression/Message | robot_id, expression_type, message |
| **INTERRUPT** | UI → Robot | Cancel movement request | robot_id |
| **INTERRUPT_CONFIRM** | UI → Robot | Confirm cancel movement | robot_id |
| **INTERRUPT_CANCEL** | UI → Robot | Abort cancel request | robot_id |
| **ARRIVAL_CONFIRM** | UI → Robot | Customer took items | robot_id |
| **ARRIVAL_CANCEL** | UI → Robot | Customer declined items | robot_id |
| **MOVE_COMPLETED** | Robot → UI | Robot finished movement | robot_id, ui_id, sequence |
| **SPEED** | UI → Robot | Change robot speed | robot_id, speed |
| **INIT** | Robot → UI | Boot/Init status update | robot_id, status, init_message |
| **PICKUP_CONFIRM** | UI → Robot | Confirm pickup | robot_id |
| **PICKUP_CANCEL** | UI → Robot | Cancel pickup | robot_id |
| **MAP_SELECTED** | UI → Robot | Active map selection | robot_id, map_id |
| **MAP_DATA** | UI → Robot | Send map binary data | robot_id, map_id, file format |

---

## Kafka Integration

### Topics Published

| Topic | Producer | Message Frequency |
|-------|----------|-------------------|
| `ui.command.op` | Router (SI) | When UI sends OP |
| `ui.command.move` | Router | When UI sends MOVE |
| `ui.command.mode` | Router | When UI sends MODE |
| `ui.command.shb` | Router | When UI sends SHB |
| `ui.command.dm` | Router | When UI sends DM |
| `ui.command.scs` | Router | When UI sends SCS |
| `ui.command.pickup_confirm` | Router | When UI sends PICKUP_CONFIRM |
| `ui.command.pickup_cancel` | Router | When UI sends PICKUP_CANCEL |
| `ui.command.interrupt` | Router | When UI sends INTERRUPT |
| `ui.command.interrupt_confirm` | Router | When UI confirms cancel |
| `ui.command.interrupt_cancel` | Router | When UI aborts cancel |
| `ui.command.arrival_confirm` | Router | When customer takes items |
| `ui.command.arrival_cancel` | Router | When customer declines |
| `ui.command.speed` | Router | When UI sends SPEED |
| `ui.command.map_selected` | Router | When UI sends MAP_SELECTED |
| `robot.state.position` | Router | Frequent (location updates) |
| `robot.state.battery` | Router | Periodic (every ~30s) |
| `robot.state.status` | Router | On state change |
| `robot.events.goal_complete` | Router | After tray delivery |
| `robot.events.move_completed` | Router | When robot arrives at destination |
| `robot.events.mapping_complete` | Router | After map complete |
| `robot.events.init` | Router | On robot boot/initialization |
| `robot.events.robot_stuck` | Router | On obstacle |
| `robot.events.emergency_stop` | Router | On safety trigger |
| `robot.events.expression` | Router | When LED/sound executed |
| `robot.command.ack` | Router | On receipt by robot |
| `ws.traffic.in` | Router | All inbound messages |
| `ws.traffic.out` | Router | All outbound messages |
| `ws.session.connect` | Router | On SI (connect) |
| `ws.session.disconnect` | SessionManager | On socket close |

### Message Enrichment

All messages produced to Kafka include:

```json
{
  "message_id": "uuid",
  "timestamp": "ISO 8601",
  "origin": "UI" | "ROBOT",
  "origin_id": "ui_id" | "robot_id",
  ...rest of message
}
```

---

## History & Audit Logging

### Tables

| Table | Purpose | Populated By |
|-------|---------|---|
| `h_ws_traffic` | Audit trail of all messages | Router, Consumers |
| `h_connection_log` | Session connect/disconnect | ConnectionLogConsumer |
| `h_command_log` | UI commands & robot events | UICommandConsumer, RobotEventConsumer |
| `h_position` | Robot location history | RobotStateConsumer |
| `h_battery` | Battery & voltage history | RobotStateConsumer |
| `h_state` | Robot state transitions | RobotStateConsumer |
| `h_expression` | LED / Sound outputs | RobotExpressionConsumer |

### Sample Queries

**Recent connections:**
```sql
SELECT device_id, event, remote_addr, connected_at 
FROM h_connection_log 
WHERE device_id IN (SELECT device_id FROM m_device WHERE device_code IN ('TEST_UI_1', 'RB001'))
ORDER BY connected_at DESC 
LIMIT 10;
```

**Robot position trail:**
```sql
SELECT robot_id, x, y, yaw, created_at 
FROM h_position 
WHERE robot_id = 'RB001' 
ORDER BY created_at DESC 
LIMIT 20;
```

**UI commands sent:**
```sql
SELECT device_id, code, payload, recorded_at 
FROM h_command_log 
WHERE code IN ('OP', 'MOVE', 'MODE') 
ORDER BY recorded_at DESC 
LIMIT 50;
```

---

## E2E Testing

### Run Tests

```bash
node test-e2e.js
```

**Prerequisites:**
- WS Gateway running on `ws://localhost:3001`
- Kafka broker running
- Backend Spring Boot running (to process queues and auto-dispatch)

### What the E2E Test Does

1. **Connects UI (SI)** → Receives `ACK_SOFT`.
2. **Connects Robot (SI)** → Receives `ACK_SOFT`.
3. **Robot sends EXPRESSION** → UI receives broadcast (expression_type: SMILE, message: HALLO).
4. **UI sends OP command (3 trays)** → Includes map_id, reqested_by, goal_id per tray; Robot receives OP.
5. **Robot sends telemetry** → POSITION, BATTERY (battery_percent, voltage), STATUS broadcasts.
6. **Robot completes tray 1** → Sends `GOAL_COMPLETE seq=1`.
7. **Backend auto-dispatches tray 2** → Robot receives `MOVE seq=2` with next destination.
8. **Robot completes tray 2** → Sends `GOAL_COMPLETE seq=2`.
9. **Backend auto-dispatches tray 3** → Robot receives `MOVE seq=3`.
10. **Robot completes tray 3** → Sends `GOAL_COMPLETE seq=3`.
11. **Backend marks queue done** → UI receives `QUEUE_COMPLETED`.
12. **Both disconnect** → WebSocket closed, `ws.session.disconnect` published to Kafka.

### Assertions Verified

- ✅ UI connects via SI and receives `ACK_SOFT`
- ✅ Robot connects via SI and receives `ACK_SOFT`
- ✅ Robot sends EXPRESSION (expression_type, message), UI receives broadcast
- ✅ UI sends OP with correct structure (map_id, reqested_by, goal_id), robot receives
- ✅ Robot sends telemetry (POSITION, BATTERY with battery_percent/voltage, STATUS), UI receives broadcasts
- ✅ Robot completes tray 1, backend auto-dispatches MOVE seq=2
- ✅ Robot receives MOVE seq=2, executes tray 2
- ✅ Robot completes tray 2, backend auto-dispatches MOVE seq=3
- ✅ Robot receives MOVE seq=3, executes tray 3
- ✅ Robot completes tray 3, backend marks queue done
- ✅ UI receives QUEUE_COMPLETED notification
- ✅ Graceful disconnect with proper ws.session.disconnect events

### Test Output Example

```
============================================================
🔥 TIFA WS GATEWAY - END-TO-END TEST
============================================================

⏳ Starting test in 1 second...

[11:03:06.032] [UI] ✅ Connected to WS Gateway
[11:03:06.062] [UI] ← ACK_SOFT
[11:03:06.376] [TEST] 🧪 Connecting Robot client...
[11:03:06.383] [ROBOT] ← ACK_SOFT
[11:03:06.827] [ROBOT] → Sending EXPRESSION: LED=GREEN
[11:03:07.048] [UI] ← EXPRESSION
[11:03:07.105] [UI] → Sending OP: 3 trays
[11:03:07.112] [ROBOT] ← OP
[11:03:07.626] [UI] ← POSITION
[11:03:07.629] [UI] ← STATUS
[11:03:07.630] [UI] ← BATTERY
[11:03:09.630] [ROBOT] → Sending GOAL_COMPLETE: sequence=1
[11:03:09.649] [ROBOT] ← MOVE
[11:03:11.676] [ROBOT] ← MOVE (seq=3)
[11:03:13.736] [UI] ← QUEUE_COMPLETED

============================================================
✅ END-TO-END TEST PASSED!
============================================================

📊 Test Summary:
   Duration: 7772ms
   UI Events: 15 messages received
   Robot Events: 4 messages received
   Flow: SI → EXPRESSION → OP → MOVE seq=2 → MOVE seq=3 → QUEUE_COMPLETED
   Trays Delivered: 3/3

🔌 Closing WebSocket connections...
[11:03:15.305] [TEST] ✅ Test completed successfully
```

---

## Development

### File Structure

```
tifa-ws/
├── src/
│   ├── index.js               # Server entry point
│   ├── ws/
│   │   ├── router.js          # Message router (handles SI, routes commands/state)
│   │   └── session-manager.js # Session tracking (UI, Robot)
│   ├── kafka/
│   │   ├── config.js          # Topic names, broker config
│   │   ├── producer.js        # Kafka producer wrapper
│   │   └── consumer.js        # Optional: consumer for inbound topics
│   └── utils/
│       ├── logger.js          # Logging wrapper
│       ├── validator.js       # Message validation
│       └── uuid.js            # Message ID generation
├── test-e2e.js                # End-to-end test (with DB assertions)
├── package.json
├── README.md (this file)
└── .env
```

### Key Modules

#### `router.js`
- `handleIncomingMessage(socket, rawData)` — Main entry point for WS messages.
- `handleSI(socket, data)` — Session creation; publishes `ws.session.connect`.
- `handleUIMessage(message)` — Route UI commands to Kafka.
- `handleRobotMessage(message)` — Route robot state/events to Kafka & broadcast.
- `sendToSocket(socket, message)` — Send message to WebSocket client.

#### `session-manager.js`
- `addUI(ui_id, socket)` — Register UI session.
- `addRobot(robot_id, socket)` — Register Robot session.
- `removeBySocket(socket)` — Cleanup on disconnect; publishes `ws.session.disconnect`.
- `getSessionBySocket(socket)` — Retrieve session info.

#### `kafka/producer.js`
- `produce(topic, message, key)` — Publish to Kafka.
  - `topic` (string): Kafka topic name.
  - `message` (object): Payload to send (will be JSON-stringified).
  - `key` (string): Partition key (ui_id, robot_id, etc.).

### Protocol Without queue_id

**Edge (Robot/UI):**
- Uses **natural keys**: `robot_id`, `ui_id`.
- Does NOT send internal `queue_id`.

**Backend (Consumers):**
- Resolves queue using `robot_id + sequence` → internal queue entry.
- Stores results in `t_goal_queue`, `t_goal_queue_detail`.
- Never exposes internal IDs back to edge.

### Extending Messages

1. Add case to `router.js` switch statements (UI or Robot).
2. Define topic in `kafka/config.js` (TOPICS).
3. Update validator in `utils/validator.js` if new fields.
4. Create/update backend consumer in Spring Boot.
5. Document message format in this README.

---

## Deployment

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 3001
CMD ["node", "src/index.js"]
```

### Environment Variables

```dotenv
WS_HOST=0.0.0.0
WS_PORT=3001
KAFKA_BROKER=kafka:9092
LOG_LEVEL=info
NODE_ENV=production
```

### Health Check

```bash
curl http://localhost:3001/health
# Returns: { "status": "ok" }
```

---

## Quick Reference: UI Targeting

### How Gateway Handles ui_id

| Direction | Behavior | Example |
|-----------|----------|---------|
| **UI → Robot** | Gateway **injects** `ui_id` automatically | UI sends `{robot_id: "RB001"}` → Robot receives `{robot_id: "RB001", ui_id: "UI_TIFA_001"}` |
| **Robot → UI (with ui_id)** | Send to **specific UI only** | Robot sends `{ui_id: "UI_TIFA_001", ...}` → Only `UI_TIFA_001` receives |
| **Robot → UI (no ui_id)** | **Broadcast to ALL UIs** | Robot sends `{robot_id: "RB001", ...}` → All connected UIs receive |

### Message Types by Delivery Mode

| Message Code | Delivery Mode | Notes |
|--------------|---------------|-------|
| `POSITION` | 📢 Broadcast | All UIs see robot location |
| `BATTERY` | 📢 Broadcast | All UIs monitor battery |
| `STATUS` | 📢 Broadcast | All UIs see robot state |
| `ACK` | 🎯 Targeted | Reply to command sender |
| `GOAL_COMPLETE` | 🎯 Targeted | Notify task initiator |
| `MOVE_COMPLETED` | 🎯 Targeted | Robot arrived at destination |
| `ROBOT_STUCK` | 🎯 Targeted (or broadcast) | Alert command sender, or all UIs if no context |
| `EMERGENCY_STOP` | 📢 Broadcast | Critical alert to all |
| `EXPRESSION` | 🎯 Targeted or 📢 Broadcast | Depends on context |
| `INTERRUPT` | 🎯 UI → Robot | Cancel movement request |
| `INTERRUPT_CONFIRM` | 🎯 UI → Robot | Confirm cancel, robot stops |
| `INTERRUPT_CANCEL` | 🎯 UI → Robot | Abort cancel, robot resumes |
| `ARRIVAL_CONFIRM` | 🎯 UI → Robot | Customer took items |
| `ARRIVAL_CANCEL` | 🎯 UI → Robot | Customer declined items |

### MOVE Command Types

| Type | Description | Use Case |
|------|-------------|----------|
| `null` or omitted | Normal delivery | Standard tray delivery |
| `"GREET"` | Greet & Guide | Robot greets customer and guides to destination |
| `"SPECIAL"` | Special delivery | Robot delivers with music/celebration |
| `"CHARGE"` | Return to charge | Robot navigates to charging station |
| `"HOMEBASE"` | Return home | Robot navigates to home base |
| `"CRUISE"` | Cruise mode | Robot patrols/cruises a route |
| `"DIRECT"` | Direct delivery | Single destination quick delivery |

**Example:**
```json
// Greet & Guide
{ "code": "MOVE", "data": { "type": "GREET", ... } }

// Special Delivery
{ "code": "MOVE", "data": { "type": "SPECIAL", ... } }

// Return to Charge
{ "code": "MOVE", "data": { "type": "CHARGE", "sequence": 999, ... } }

// Return to Home Base
{ "code": "MOVE", "data": { "type": "HOMEBASE", "sequence": 999, ... } }

// Normal Delivery
{ "code": "MOVE", "data": { ... } }
```

---

## Troubleshooting

### No messages received by backend?

1. Verify Kafka is running: `kafka-topics.sh --list --bootstrap-server localhost:9092`
2. Check topic existence: topics should exist (created by script in backend).
3. Monitor broker logs: `docker logs kafka` (if Docker).

### UI not receiving robot state?

1. Confirm robot is connected (check `session-manager.getAllRobots()`).
2. Verify router broadcasts in `handleRobotMessage()`.
3. Check `h_ws_traffic` for outgoing messages.

### Connection log not populated?

1. Ensure `ConnectionLogConsumer` is running in backend.
2. Check `ws.session.connect` and `ws.session.disconnect` topics exist.
3. Verify `m_device` table has auto-registration enabled.

### Battery schema mismatch?

- Use `battery_percent` and `voltage` (not ~~`is_charging`~~).
- Ensure `h_battery` table has columns: `robot_id`, `battery_percent`, `voltage`, `created_at`.

---

## References

- **Protocol Design:** Natural keys, no internal IDs exposed to edge.
- **Audit Trail:** All messages logged to Kafka topics and PostgreSQL history tables.
- **Idempotency:** Backend uses `t_message_dedupe` to prevent duplicate processing.


---

## Changelog

### v3.2 (2026-04-10) — Universal Message Coverage

#### New Kafka Topics

| Topic | Purpose |
|-------|---------|
| `ws.misc.ui` | Catch-all for unmapped UI codes |
| `ws.misc.robot` | Catch-all for unmapped robot codes |
| `ui.command.map_selected` | Map selection notification |

#### Router Refactoring (`router.js`)

Replaced hardcoded `switch` blocks with declarative `UI_TOPIC_MAP` / `ROBOT_TOPIC_MAP` objects. Any code not listed in the map now falls back to `ws.misc.*` — **no message is ever dropped silently**.

```js
// Before: switch (code) { default: logger.warn(...) }  ← message dropped
// After:
const topicKey = MessageRouter.UI_TOPIC_MAP[code];
const topic    = topicKey ? TOPICS[topicKey] : TOPICS.WS_MISC_UI;
await kafkaProducer.produce(topic, message);  // ALWAYS published
```

#### New UI Code: `MAP_SELECTED`

Standard UI command — sent when operator selects a new map:

```json
{
  "code": "MAP_SELECTED",
  "data": {
    "robot_id": "RB001",
    "map_id": 5
  }
}
```

Routes to `ui.command.map_selected` → consumed by `WsTrafficCatchAllConsumer` in tifa-be.

---

**Last Updated:** 2026-04-10  
**Version:** 3.2
