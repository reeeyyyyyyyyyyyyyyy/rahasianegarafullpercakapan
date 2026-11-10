# 🤖 TIFA App - Service Robot HMI

**React-based Human-Machine Interface** for TIFA service robot platform with IndexedDB database and real-time WebSocket communication.

> **Per-browser database** - Each browser maintains its own persistent data using IndexedDB

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [Features](#-features)
3. [Architecture](#-architecture)
4. [Database (IndexedDB)](#-database-indexeddb)
5. [WebSocket Integration](#-websocket-integration)
6. [Face Expressions](#-face-expressions)
7. [Operation Modes](#-operation-modes)
8. [Settings](#-settings)
9. [Development](#-development)
10. [Deployment](#-deployment)
11. [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development
npm run dev
```

**Access:** http://localhost:5173

---

## 🎯 Features

### Operation Modes

- ✅ **📦 Delivery Mode** - Multi-tray delivery with dynamic tray management
- ✅ **🎯 Direct Delivery** - Single-tray with category filtering
- ✅ **👋 Greet & Guide** - Welcome and guide visitors
- ✅ **🚶 Cruise Mode** - Autonomous patrol with waypoints
- ✅ **🎉 Special Mode** - Delivery with music (Birthday, Jingle Bells)
- ✅ **🔙 Return Mode** - Navigate to charging station or home base
- ✅ **🎵 Music Player** - Playlist and song management
- ✅ **⚙️ Settings** - Configure WS, volumes, brightness, trays

### Technical Features

- 🗄️ **IndexedDB** - Browser-based persistent storage with auto-seeding
- 🔌 **WebSocket** - Real-time bidirectional communication
- 🎭 **Anime-Style Expressions** - 9 different facial expressions with smooth animations
- � **Battery Indicator** - Real-time battery status with color-coded display
- �📍 **Map Integration** - Visual map with destinations and robot position
- 🎵 **Music Control** - Playlist creation and background music
- 🎚️ **Volume Control** - Separate controls for TTS, Media, Master volume
- 🎨 **Tray Management** - Enable/disable trays in Settings, auto-sync with Delivery Mode
- 🔔 **Toast Notifications** - Real-time alerts and confirmations
- 📱 **Responsive Design** - Optimized for tablet interfaces
- ⚡ **Smart Delivery** - Auto-confirmation for last tray, timeout detection
- 🎯 **Dynamic Overlays** - Mode-specific delivery progress messages

---

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18 + Vite 5.4
- **Styling**: TailwindCSS + Framer Motion
- **State Management**: Zustand with persist
- **Database**: Dexie.js 4.2.1 (IndexedDB wrapper)
- **Communication**: WebSocket (tifa-ws gateway)
- **Icons**: Lucide React

### Project Structure

```
tifa-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── BatteryIndicator.jsx    # Battery status display
│   │   ├── ScreenLayout.jsx
│   │   ├── ConfirmDialog.jsx
│   │   ├── DeliveryOverlay.jsx     # Dynamic delivery progress
│   │   ├── Toast.jsx
│   │   └── ...
│   ├── pages/               # Route pages
│   │   ├── DeliveryMode/
│   │   ├── DirectDeliveryMode/
│   │   ├── FaceExpression/  # Anime-style expressions
│   │   ├── Music/
│   │   └── Settings/
│   ├── store/               # Zustand state stores
│   │   ├── websocketStore.js       # WS logic + delivery flow
│   │   ├── destinationStore.js
│   │   ├── trayStore.js
│   │   ├── settingsStore.js
│   │   ├── uiStore.js              # UI state + overlays
│   │   └── ...
│   ├── services/
│   │   └── WebSocketService.js
│   ├── database/
│   │   └── indexedDB.js            # Dexie schema + seeding
│   └── App.jsx
└── package.json
```
│   │   └── ...
│   ├── services/
│   │   └── WebSocketService.js
│   ├── database/
│   │   └── indexedDB.js
│   └── App.jsx
└── package.json
```

---

## 🗄️ Database (IndexedDB)

### Schema (Version 3)

```javascript
db.version(3).stores({
  maps: '++map_id, map_name, is_active',
  categories: '++category_id, category_name, category_type',
  destinations: '++destination_id, map_id, category_id, destination_name, destination_code, is_active, is_home',
  settings: 'setting_key',
  robot_state: 'state_key'  // Stores battery, position, etc.
});
```

### Seed Data

**Auto-initialized on first load** with explicit destination IDs:

```javascript
// Destinations
{ destination_id: 10, name: 'Destination 1', code: 'DST001', x: 2.54, y: 2.04, yaw: 0.0 },
{ destination_id: 11, name: 'Destination 2', code: 'DST002', x: 1.30, y: 2.59, yaw: 1.57 },
{ destination_id: 12, name: 'Destination 3', code: 'DST003', x: 1.49, y: 1.87, yaw: 1.57 },
{ destination_id: 999, name: 'Home Base', code: 'HOME', is_home: 1, x: 0.0, y: 0.0, yaw: 0.0 },
{ destination_id: 998, name: 'Charging Station', code: 'CHARGE', x: 5.0, y: 5.0, yaw: 1.57 }

// Settings
{ setting_key: 'ws_url', setting_value: 'wss://tifa-ws.forgix.com' },
{ setting_key: 'ui_id', setting_value: 'UI_TIFA_001' },
{ setting_key: 'robot_id', setting_value: 'RB001' },
{ setting_key: 'map_id', setting_value: '1' },
{ setting_key: 'master_volume', setting_value: '80' },
{ setting_key: 'voice_volume', setting_value: '100' },
{ setting_key: 'music_volume', setting_value: '60' }
```

### Key Features

- **Coordinate-based Lookup**: Finds destination_id by matching x/y/yaw with tolerance (±0.01)
- **Persistent Battery**: Stores last known battery state, survives refresh
- **HomeBase from DB**: Loads home coordinates from IndexedDB (is_home=1)
- **Auto-seeding**: Database initializes automatically on first run

### Reset Database

```javascript
// Browser console
window.resetDatabase()
```

---

## 🔌 WebSocket Integration

### Connection

**Gateway**: `tifa-ws` (WebSocket server)

```javascript
const wsUrl = settings?.ws_url || 'wss://tifa-ws.forgix.com'
const uiId = settings?.ui_id || 'UI_TIFA_001'
const robotId = settings?.robot_id || 'RB001'
```

### Message Types

#### **Outgoing (UI → Robot)**

##### OP (Multi-Tray Operation)
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
        "dest": { "x": 2.54, "y": 2.04, "yaw": 0.0 },
        "goal_id": 10
      },
      {
        "tray": 2,
        "dest": { "x": 1.30, "y": 2.59, "yaw": 1.57 },
        "goal_id": 11
      }
    ],
    "home_base": { "x": 0.0, "y": 0.0, "yaw": 0.0 }
  }
}
```

**Key Features**:
- `goal_id`: Destination ID from IndexedDB (coordinate-based lookup)
- `home_base`: Loaded from IndexedDB (is_home=1)
- Auto-triggers delivery overlay with "Delivery in Progress"

##### MOVE (Single Navigation)
```json
{
  "code": "MOVE",
  "data": {
    "robot_id": "RB001",
    "sequence": 1,
    "dest": { "x": 1.30, "y": 2.59, "yaw": 1.57 },
    "home_base": { "x": 0.0, "y": 0.0, "yaw": 0.0 },
    "type": "GREET"
  }
}
```

**Type values**: 
- `"GREET"` - Greet & Guide mode (overlay: "Greet & Guide Mode")
- `"SPECIAL"` - Special delivery (overlay: "Special Delivery")
- `null` - Direct delivery (overlay: "Direct Delivery")

##### INTERRUPT (Cancel Delivery)
```json
{
  "code": "INTERRUPT",
  "data": {
    "robot_id": "RB001"
  }
}
```

**Flow**: Click overlay → Show confirm dialog → Send INTERRUPT → Wait for INTERRUPT_CONFIRM/INTERRUPT_CANCEL

#### **Incoming (Robot → UI)**

##### BATTERY (Real-time Battery Status)
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

**Features**:
- Displayed in horizontal battery indicator
- Color-coded: Green (>60%), Amber (20-60%), Red (<20%)
- Persisted to IndexedDB (survives refresh)
- Auto-loads on app initialization

##### GOAL_COMPLETE (Tray Delivered)
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

**Smart Logic**:
- **Last tray**: Auto-confirms, sets 3s timeout for QUEUE_COMPLETED
- **Not last tray**: Shows confirmation dialog "Tray X Arrived!"

##### QUEUE_COMPLETED (All Deliveries Done)
```json
{
  "code": "QUEUE_COMPLETED",
  "data": {
    "robot_id": "RB001"
  }
}
```

**Actions**:
- Clears delivery state and overlay
- Shows toast "All deliveries completed!"
- Triggers happy expression with 1.5s delay
- Navigates to expression page (stays there, no auto-return)

##### MOVE_COMPLETED (Direct Delivery Done)
```json
{
  "code": "MOVE_COMPLETED",
  "data": {
    "robot_id": "RB001"
  }
}
```

**Actions**:
- Clears delivery state and overlay
- Shows toast "Direct delivery successful!"
- Triggers happy expression with 1.5s delay
- Stays on expression page

##### EXPRESSION (Face Display Command)
```json
{
  "code": "EXPRESSION",
  "data": {
    "robot_id": "RB001",
    "expression_type": "EXPRESSION",
    "message": "happy"
  }
}
```

**Expression Types**: happy, laugh, sad, angry, surprised, sleepy, wink, sparkle, dizzy

##### ROBOT_STUCK (Navigation Issue)
```json
{
  "code": "ROBOT_STUCK",
  "data": {
    "robot_id": "RB001",
    "ui_id": "UI_TIFA_001",
    "sequence": 1,
    "reason": "OBSTACLE_DETECTED",
    "position": { "x": 2.54, "y": 2.04, "yaw": 0.0 }
  }
}
```

**Action**: Shows warning toast with reason

---

## 🎭 Face Expressions

### Available Expressions (Anime-Style)

9 different anime-style facial expressions with smooth animations:

1. **happy** 😊 - Normal anime eyes with shine effect & eyelashes
2. **laugh** 😄 - Closed happy eyes with big smile and teeth
3. **sad** 😢 - Puppy eyes with animated falling tears
4. **angry** 😠 - Half-lidded annoyed eyes with slanted eyebrows
5. **surprised** 😮 - Wide shocked eyes with O mouth
6. **sleepy** 😴 - Tired eyes with floating "ZZZ"
7. **wink** 😉 - One eye open, one closed
8. **sparkle** ✨ - Star eyes (love/excited)
9. **dizzy** 😵 - Rotating spiral eyes (confused)

### Features

- Anime-style design with detailed eyelashes and shine effects
- Smooth animations using Framer Motion
- Automatic blinking for realistic effect
- Real-time updates via WebSocket
- Timestamp-based re-rendering
- **Audio support**: Play sounds, TTS, and PCM streaming

### Usage

#### Visual Expression
```json
{
  "type": "EXPRESSION",
  "data": {
    "expression_type": "EXPRESSION",
    "message": "wink"
  }
}
```

#### Play Sound (Base64)
```json
{
  "type": "EXPRESSION",
  "data": {
    "expression_type": "SOUND",
    "message": "<base64-encoded-audio>",
    "format": "wav"
  }
}
```

**Supported formats**: `wav`, `mp3`, `ogg`

#### Play Sound (PCM Raw)
```json
{
  "type": "EXPRESSION",
  "data": {
    "expression_type": "SOUND",
    "message": "<base64-encoded-pcm>",
    "format": "pcm",
    "sample_rate": 16000,
    "channels": 1,
    "bit_depth": 16
  }
}
```

#### PCM Streaming (Low Latency)

**Step 1: Start Stream**
```json
{
  "type": "EXPRESSION",
  "data": {
    "expression_type": "SOUND_STREAM_START",
    "stream_id": "tts_001",
    "sample_rate": 16000,
    "channels": 1,
    "bit_depth": 16
  }
}
```

**Step 2: Send Chunks**
```json
{
  "type": "EXPRESSION",
  "data": {
    "expression_type": "SOUND_STREAM_CHUNK",
    "stream_id": "tts_001",
    "chunk": "<base64-pcm-chunk>",
    "index": 0,
    "is_last": false
  }
}
```

**Step 3: End Stream**
```json
{
  "type": "EXPRESSION",
  "data": {
    "expression_type": "SOUND_STREAM_END",
    "stream_id": "tts_001"
  }
}
```

#### Text-to-Speech
```json
{
  "type": "EXPRESSION",
  "data": {
    "expression_type": "TTS",
    "message": "Hello, welcome to TIFA robot!",
    "lang": "en-US"
  }
}
```

**Supported languages**: `en-US`, `id-ID`, `zh-CN`, etc. (browser dependent)

#### Sound + Expression Combined
```json
{
  "type": "EXPRESSION",
  "data": {
    "expression_type": "SOUND_WITH_EXPRESSION",
    "message": "<base64-audio>",
    "format": "wav",
    "expression": "happy"
  }
}
```

### Expression Types Summary

| expression_type | Description | Required Fields |
|-----------------|-------------|-----------------|
| `EXPRESSION` | Visual face expression | `message` (expression name) |
| `SOUND` | Play audio file | `message` (base64), `format` |
| `SOUND_STREAM_START` | Start PCM streaming | `stream_id`, `sample_rate`, `channels`, `bit_depth` |
| `SOUND_STREAM_CHUNK` | Send PCM chunk | `stream_id`, `chunk` (base64), `index`, `is_last` |
| `SOUND_STREAM_END` | End streaming | `stream_id` |
| `TTS` | Text-to-speech | `message` (text), `lang` |
| `SOUND_WITH_EXPRESSION` | Sound + visual expression | `message`, `format`, `expression` |
| `LED` | LED control (future) | `message` |

---

## 🚚 Operation Modes

### 1. Delivery Mode (Multi-Tray)

**Features**:
- ✅ **Dynamic tray management** - Only shows enabled trays from Settings
- ✅ Select multiple destinations per tray
- ✅ Visual tray selector (robot body SVG)
- ✅ Connection status indicator
- ✅ Auto-clear after delivery

**Flow**:
1. Enable/disable trays in Settings → Tray Settings
2. Select tray → Pick destinations
3. Click "Start" → Confirm → Send OP command
4. Robot delivers to all destinations
5. Returns to home base automatically

### 2. Return Mode

**Features**:
- Navigate to **Charging Station** (type: "CHARGE")
- Navigate to **Home Base** (type: "HOMEBASE")
- Direct database queries (bypasses filtering)
- Sequence: 999 for return operations

**System Destinations**:
- HOME and CHARGE are **filtered out** from normal modes
- Only visible in ReturnMode
- Stored with special flags (`is_home=1`, `destination_code='CHARGE'`)

---

## ⚙️ Settings

### Connection Settings

- **WebSocket URL**: Gateway address (default: wss://tifa-ws.forgix.com)
- **UI ID**: Interface identifier (default: UI_TIFA_001)
- **Robot ID**: Target robot (default: RB001)
- **Test Connection**: Reconnect button with live status

### Volume Settings

- **Master Volume**: Overall output (0-100, default: 80)
- **Voice Volume**: Text-to-speech (0-100, default: 100)
- **Music Volume**: Background music (0-100, default: 60)

### Tray Settings

- **Enable/Disable Trays**: Click to toggle active state
- **Active Counter**: Shows "Active: X / Y trays"
- **Auto-Sync**: Delivery Mode shows only enabled trays
- **Visual Feedback**: Green checkmark for enabled, red X for disabled

**Usage Flow**:
1. Settings → Tray Settings
2. Click trays to enable/disable (1-3)
3. Go to Delivery Mode
4. Only enabled trays appear in robot SVG

### Debug Settings

- **Reset Database**: `window.resetDatabase()` - Clears all IndexedDB data and re-seeds
- **Clear Cache**: Browser cache management
- **Connection Logs**: WebSocket message history

---

## 🛠️ Development

### Development Server

```bash
npm run dev
# http://localhost:5173
```

### Build for Production

```bash
npm run build
npm run preview
```

### Database Management

```bash
# Browser console
window.resetDatabase()  // Full reset + re-seed
```

### Environment Variables

`.env`:
```env
VITE_WS_URL=wss://tifa-ws.forgix.com
VITE_UI_ID=UI_TIFA_001
VITE_ROBOT_ID=RB001
```

**Note**: Home base coordinates now loaded from IndexedDB, not environment variables

---

## 🚀 Deployment

```bash
# Build
npm run build

# Deploy dist/ folder to web server
```

### Production Checklist

- ✅ Update WebSocket URL in Settings
- ✅ Configure UI ID and Robot ID
- ✅ Test battery indicator with real robot
- ✅ Verify destination coordinates in IndexedDB
- ✅ Test all delivery modes end-to-end
- ✅ Check expression navigation (should stay on page)

---

## 🐛 Troubleshooting

### Database Issues

**Problem**: Schema error / corrupted data

**Solution**:
```javascript
window.resetDatabase()  // Browser console
```

### WebSocket Issues

**Problem**: Not connecting / disconnecting randomly

**Solution**:
1. Check WS URL in Settings → Connection
2. Verify `tifa-ws` gateway is running
3. Check browser console for errors
4. Test with: Settings → Connection → "Test Connection"

### Battery Not Showing

**Problem**: Battery shows "?"

**Solution**:
1. Check WebSocket connection
2. Verify robot is sending BATTERY messages
3. Check browser console for `BATTERY` message logs
4. Battery data auto-loads from IndexedDB on refresh

### Tray Issues

**Problem**: Trays not showing in Delivery Mode

**Solution**:
1. Go to Settings → Tray Settings
2. Enable desired trays (click to toggle)
3. Return to Delivery Mode
4. Enabled trays will appear

### Expression Not Returning

**Problem**: Expression page doesn't auto-return to delivery page

**Solution**: This is **expected behavior**. Expression now stays on page after QUEUE_COMPLETED/MOVE_COMPLETED. User can tap expression to return manually if needed.

### Overlay Wrong Title

**Problem**: Overlay shows wrong mode title

**Solution**: Each mode sets custom overlay text:
- Delivery Mode: "Delivery in Progress"
- Direct Delivery: "Direct Delivery"
- Greet & Guide: "Greet & Guide Mode"
- Special: "Special Delivery"

If wrong, check `showDeliveryInProgress()` call in websocketStore.js

---

## 📝 Key Implementation Notes

### Coordinate-Based Destination Lookup

System uses tolerance-based matching (±0.01) to find destination_id from coordinates:

```javascript
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
const goalId = destination?.destination_id || fallback;
```

### Smart Last-Tray Detection

```javascript
const isLastGoal = newCompletedGoals.length >= activeDelivery.trayTasks.length;

if (isLastGoal) {
  // Auto-confirm last tray
  confirmPickup(robot_id, sequence);
  
  // Set 3-second timeout for QUEUE_COMPLETED
  const timeoutId = setTimeout(() => {
    // QUEUE_COMPLETED didn't arrive - keep overlay open
  }, 3000);
} else {
  // Show confirmation dialog for non-last trays
  openConfirmDialog("Tray X Arrived!", "Has the food been picked up?", ...);
}
```

### Expression Navigation Flow

```javascript
// App.jsx ExpressionHandler (modified)
useEffect(() => {
  if (currentExpression && location.pathname !== '/') {
    navigate('/', { state: { expressionType: currentExpression.type } });
    // Removed: auto-return timer (was 5000ms)
    // Now: stays on expression page
  }
}, [currentExpression?.timestamp]);
```

### IndexedDB Per-Browser

- Each browser has **separate database**
- Data **NOT shared** between browsers/devices
- Manual sync required for multi-device setup
- Use backend API for cross-device data sync

---

## Changelog

### v3.1 (2026-04-10) — Map Management

#### IndexedDB Schema v4

Additive upgrade — existing data preserved, no migration required:

```js
db.version(4).stores({
  maps: '++map_id, map_name, is_active, last_updated, sync_flag',
  destinations: '... + last_updated, sync_flag',
  categories: '... + last_updated, sync_flag',
});
```

`sync_flag` values: `0` = synced, `1` = pending push, `2` = local only.

#### sendMapSelected

New method added to all 3 service layers — automatically routes to WS or ADB:

```js
// websocketStore.js
sendMapSelected(mapId) → commManager.sendMapSelected(robotId, mapId)

// commManager uses ADB if mode=ADB+connected, else WebSocket
```

#### MAP_SELECTED incoming handler

When backend acknowledges map selection, `map_id` is persisted to `db.settings`.

#### MapSettings Page

Full replacement of the placeholder. Complete flow on map selection:

1. `GET /api/maps/{id}/details` → fresh destinations + categories
2. Dexie transaction: clear → repopulate `maps`, `destinations`, `categories`
3. `sendMapSelected(mapId)` via WebSocket → backend audit
4. `GET /api/maps/{id}/download/zip` → push to robot via ADB as base64 `MAP_DATA`

---

**Last Updated**: April 10, 2026  
**Version**: 3.1.0
