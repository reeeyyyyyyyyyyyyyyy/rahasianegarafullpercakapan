# 🚀 TIFA Backend API - Spring Boot v3.0.0

**REST API Backend** for TIFA Robot Delivery Platform with JWT authentication, Kafka integration, and PostgreSQL database.

---

## 📋 Table of Contents

1. [Overview & Tech Stack](#-overview--tech-stack)
2. [Project Structure](#-project-structure)
3. [Setup & Installation](#-setup--installation)
4. [API Endpoints](#-api-endpoints)
5. [Kafka Consumers](#-kafka-consumers)
6. [Database Schema](#-database-schema)
7. [Configuration](#-configuration)
8. [Testing Guide](#-testing-guide)

---

## 🎯 Overview & Tech Stack

### Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Spring Boot** | 2.7.18 | Application framework |
| **Java** | 11 | Programming language |
| **PostgreSQL** | 14+ | Relational database |
| **Kafka (KafkaJS)** | 3.0+ | Message broker |
| **JWT (jjwt)** | 0.11.5 | Authentication |
| **Spring Data JPA** | 2.7.18 | ORM |
| **Spring Security** | 2.7.18 | Security framework |
| **Maven** | 3.6+ | Build tool |
| **SnakeYAML** | 2.2 | YAML parsing (ROS maps) |

### Key Features

✅ **JWT Authentication** - Token-based auth for UI clients  
✅ **Kafka Integration** - 9 consumer listeners for real-time events  
✅ **Multi-Tray Queue** - Sequential tray delivery with automatic dispatch  
✅ **Map Management** - PGM/YAML upload with versioning  
✅ **Device Management** - Robot network configuration  
✅ **Command Logging** - Complete audit trail (h_command_log)  
✅ **Message Deduplication** - Prevent duplicate Kafka message processing  
✅ **Auto-Dispatch Logic** - Automatic next tray dispatch on GOAL_COMPLETE  

---

## 📁 Project Structure

```
tifa-be/
├── src/main/java/com/tifa/delivery/
│   ├── TifaDeliveryBackendApplication.java    # Main @SpringBootApplication
│   │
│   ├── controller/                             # REST Controllers (7)
│   │   ├── AuthController.java                 # /auth/login, /auth/validate
│   │   ├── DeliveryController.java             # /api/delivery/confirm
│   │   ├── DeviceController.java               # /api/devices/*
│   │   ├── GoalController.java                 # /api/goals/*
│   │   ├── MapController.java                  # /api/maps/*
│   │   ├── RobotCommandController.java         # /api/robot/*
│   │   └── WSController.java                   # /api/ws/*
│   │
│   ├── service/                                # Business Logic (9)
│   │   ├── AuthService.java                    # JWT gen/validation
│   │   ├── CommandLogService.java              # h_command_log operations
│   │   ├── DeliveryService.java                # Tray delivery workflow
│   │   ├── DeviceService.java                  # Device CRUD
│   │   ├── FileStorageService.java             # Filesystem ops
│   │   ├── GoalService.java                    # Queue management
│   │   ├── MapDownloadService.java             # Map retrieval
│   │   ├── MapUploadService.java               # Map processing
│   │   └── YamlParserService.java              # ROS YAML parser
│   │
│   ├── kafka/                                  # Kafka Integration
│   │   ├── config/
│   │   │   └── KafkaConsumerConfig.java        # @Configuration
│   │   ├── consumer/                           # @KafkaListener (9)
│   │   │   ├── UICommandConsumer.java          # ui.command.op/move
│   │   │   ├── RobotStateConsumer.java         # robot.state.*
│   │   │   ├── RobotEventConsumer.java         # robot.events.goal_complete
│   │   │   ├── RobotCommandAckConsumer.java    # robot.command.ack
│   │   │   ├── RobotExpressionConsumer.java    # robot.events.expression
│   │   │   ├── ConnectionLogConsumer.java      # ws.session.*
│   │   │   ├── SHBConsumer.java                # ui.command.shb
│   │   │   ├── SCSConsumer.java                # ui.command.scs
│   │   │   └── DiagnosticConsumer.java         # ui.command.dm
│   │   ├── MessageDedupeService.java           # Deduplication
│   │   └── KafkaHealthIndicator.java           # Health actuator
│   │
│   ├── entity/                                 # JPA Entities (14+)
│   │   ├── User.java                           # t_user
│   │   ├── Device.java                         # m_device
│   │   ├── Map.java                            # m_map
│   │   ├── MapVersion.java                     # m_map_version
│   │   ├── FileGroup.java                      # g_file_group
│   │   ├── GFile.java                          # g_file
│   │   ├── GoalQueue.java                      # t_goal_queue
│   │   ├── GoalQueueDetail.java                # t_goal_queue_detail
│   │   ├── DeviceNetwork.java                  # m_device_network
│   │   ├── CommandLog.java                     # h_command_log
│   │   ├── Position.java                       # h_position
│   │   ├── Battery.java                        # h_battery
│   │   ├── RobotStatus.java                    # h_status
│   │   └── MessageDedupe.java                  # t_message_dedupe
│   │
│   ├── repository/                             # Spring Data JPA (14+)
│   │   ├── UserRepository.java
│   │   ├── DeviceRepository.java
│   │   ├── MapRepository.java
│   │   ├── GoalQueueRepository.java
│   │   ├── GoalQueueDetailRepository.java
│   │   └── ... (more repositories)
│   │
│   ├── security/                               # Security
│   │   ├── JwtTokenProvider.java               # JWT ops
│   │   └── JwtAuthenticationFilter.java        # Filter chain
│   │
│   ├── config/                                 # Configuration
│   │   └── SecurityConfig.java                 # @EnableWebSecurity
│   │
│   ├── dto/                                    # DTOs
│   │   ├── LoginRequest.java
│   │   ├── LoginResponse.java
│   │   ├── DeliveryConfirmRequest.java
│   │   └── ... (more DTOs)
│   │
│   └── util/                                   # Utilities
│       └── MessageIdGenerator.java
│
├── src/main/resources/
│   ├── application.properties                  # Main config
│   └── ... (optional configs)
│
├── pom.xml                                     # Maven dependencies
└── target/
    └── robot-delivery-backend-v3-3.0.0.jar     # Build artifact
```

---

## 🛠️ Setup & Installation

### Prerequisites

- **Java 11+**
- **Maven 3.6+**
- **PostgreSQL 14+**
- **Apache Kafka 3.0+** (with Zookeeper)
- **Node.js 16+** (for tifa-ws gateway)

### 1. Database Setup

```sql
-- Create database
CREATE DATABASE tifa;

-- Connect to database
\c tifa

-- Tables will be auto-created by Hibernate (ddl-auto=update)
-- Or manually run DDL scripts if available
```

### 2. Configure Application

Edit `src/main/resources/application.properties`:

```properties
# =========================
# APPLICATION
# =========================
spring.application.name=tifa-be
server.port=8080

# =========================
# DATABASE (PostgreSQL)
# =========================
spring.datasource.url=jdbc:postgresql://localhost:5432/tifa
spring.datasource.username=postgres
spring.datasource.password=your_password_here
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA / Hibernate
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false

# =========================
# JWT CONFIGURATION
# =========================
jwt.secret=tifa-secret-key-change-in-production
jwt.expiration=86400000

# =========================
# KAFKA
# =========================
spring.kafka.bootstrap-servers=localhost:9092
spring.kafka.consumer.group-id=tifa-backend-group
spring.kafka.consumer.auto-offset-reset=earliest

# =========================
# FILE STORAGE
# =========================
file.upload.dir=D:/data/maps
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=20MB

# =========================
# WEBSOCKET GATEWAY
# =========================
ws.cloud.router.url=http://localhost:3001
ws.cloud.router.enabled=true
```

### 3. Build Project

```bash
cd tifa-be
mvn clean package
```

### 4. Run Application

**Development Mode:**
```bash
mvn spring-boot:run
```

**Production Mode:**
```bash
java -jar target/robot-delivery-backend-v3-3.0.0.jar
```

Application runs on: **http://localhost:8080**

---

## 📡 API Endpoints

### Authentication

#### POST /auth/login
Login with username/password, returns JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer",
  "expiresIn": 86400000,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "ADMIN"
  }
}
```

#### POST /auth/validate
Validate JWT token.

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "valid": true,
  "username": "admin",
  "expiresAt": "2024-12-10T10:00:00Z"
}
```

---

### Delivery Management

#### POST /api/delivery/confirm
Confirm pickup and trigger next tray dispatch.

**Request:**
```json
{
  "robot_id": "RB001",
  "sequence": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pickup confirmed, next tray dispatched",
  "next_tray": {
    "sequence": 2,
    "tray": 2,
    "destination": {
      "x": 15.0,
      "y": 8.0,
      "yaw": 1.57
    }
  }
}
```

---

### Goal Queue Management

#### GET /api/goals
Get all goal queues (paginated).

**Query Parameters:**
- `page` (default: 0)
- `size` (default: 20)
- `status` (optional: QUEUED, IN_PROGRESS, DONE, CANCELLED)

**Response:**
```json
{
  "content": [
    {
      "queueId": 1,
      "queueCode": "Q20241209001",
      "deviceId": 1,
      "status": "IN_PROGRESS",
      "createdAt": "2024-12-09T10:00:00Z",
      "details": [
        {
          "sequence": 1,
          "tray": 1,
          "status": "DONE",
          "dest": { "x": 10.5, "y": 5.2, "yaw": 0.0 }
        },
        {
          "sequence": 2,
          "tray": 2,
          "status": "IN_PROGRESS",
          "dest": { "x": 15.0, "y": 8.0, "yaw": 1.57 }
        }
      ]
    }
  ],
  "totalElements": 50,
  "totalPages": 3
}
```

#### GET /api/goals/{queueId}
Get specific queue details.

#### DELETE /api/goals/{queueId}
Cancel queue (sets status to CANCELLED).

---

### Device Management

#### GET /api/devices
List all devices.

#### GET /api/devices/{deviceId}
Get device details including network info.

**Response:**
```json
{
  "deviceId": 1,
  "deviceName": "TIFA Robot 001",
  "robotId": "RB001",
  "network": {
    "ssid": "TIFA_ROBOT_001",
    "ipAddress": "192.168.1.100",
    "fallbackIp": "10.0.0.1"
  },
  "status": "ONLINE"
}
```

---

### Map Management

#### POST /api/maps/upload
Upload ROS map (PGM + YAML).

**Request:** `multipart/form-data`
- `map_name`: string
- `pgm_file`: file (image/x-portable-graymap)
- `yaml_file`: file (application/x-yaml)

**Response:**
```json
{
  "success": true,
  "mapId": 5,
  "versionId": 12,
  "message": "Map uploaded successfully"
}
```

#### GET /api/maps
List all maps.

#### GET /api/maps/{mapId}/download
Download map files (ZIP).

---

## 🎯 Kafka Consumers

Backend listens to 9 Kafka topics with dedicated consumers:

### 1. UICommandConsumer

**Topics:** 
- `ui.command.op` - Multi-tray operation
- `ui.command.move` - Single move

**Purpose:** Process UI commands, create goal queue & details

**Logic:**
```java
@KafkaListener(topics = "ui.command.op")
public void handleOPCommand(String message) {
    // Parse OP command
    // Create GoalQueue
    // Create GoalQueueDetail for each tray
    // Dispatch first tray to robot via Gateway
    // Log to h_command_log
}
```

---

### 2. RobotStateConsumer

**Topics:**
- `robot.state.position` → h_position
- `robot.state.battery` → h_battery
- `robot.state.status` → h_status

**Purpose:** Log robot state to history tables

---

### 3. RobotEventConsumer

**Topics:**
- `robot.events.goal_complete`
- `robot.events.queue_completed`
- `robot.events.robot_stuck`
- `robot.events.emergency_stop`

**Purpose:** Handle robot events, trigger next tray dispatch

**Auto-Dispatch Logic:**
```java
@KafkaListener(topics = "robot.events.goal_complete")
public void handleGoalComplete(String message) {
    // 1. Mark current tray as DONE
    // 2. Find next tray (sequence + 1)
    // 3. If next tray exists:
    //    - Produce dispatch_next_tray to Kafka
    //    - Gateway forwards MOVE to robot
    // 4. If no more trays:
    //    - Mark queue as DONE
    //    - Produce queue_completed event
}
```

---

### 4. RobotCommandAckConsumer

**Topic:** `robot.command.ack`

**Purpose:** Update h_command_log with ACK status

---

### 5. RobotExpressionConsumer

**Topic:** `robot.events.expression`

**Purpose:** Log expression events

---

### 6. ConnectionLogConsumer

**Topics:**
- `ws.session.connect`
- `ws.session.disconnect`

**Purpose:** Log to h_connection_log

---

### 7. SHBConsumer

**Topic:** `ui.command.shb` (Set Home Base)

**Purpose:** Update robot home base coordinates

---

### 8. SCSConsumer

**Topic:** `ui.command.scs` (Set Charging Station)

**Purpose:** Update robot charging station coordinates

---

### 9. DiagnosticConsumer

**Topic:** `ui.command.dm` (Diagnostic Mode)

**Purpose:** Handle diagnostic commands

---

## 🗄️ Database Schema

### Queue Tables

#### t_goal_queue
Main delivery queue.

```sql
CREATE TABLE t_goal_queue (
    goal_queue_id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL,
    queue_code VARCHAR(50) UNIQUE,
    queue_status VARCHAR(20) DEFAULT 'QUEUED',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    message_id VARCHAR(100)
);
```

**Status:** QUEUED, IN_PROGRESS, DONE, CANCELLED

#### t_goal_queue_detail
Individual tray tasks.

```sql
CREATE TABLE t_goal_queue_detail (
    goal_queue_detail_id SERIAL PRIMARY KEY,
    goal_queue_id INTEGER NOT NULL,
    sequence_order INTEGER NOT NULL,
    tray_number INTEGER NOT NULL,
    dest_x DECIMAL(10,2),
    dest_y DECIMAL(10,2),
    dest_yaw DECIMAL(10,2),
    tray_status VARCHAR(20) DEFAULT 'QUEUED',
    dispatched_at TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (goal_queue_id) REFERENCES t_goal_queue(goal_queue_id)
);
```

**Status:** QUEUED, DISPATCHED, DONE, FAILED

---

### History Tables

#### h_command_log
All commands logged here.

```sql
CREATE TABLE h_command_log (
    log_id SERIAL PRIMARY KEY,
    device_id INTEGER,
    command_code VARCHAR(50),
    command_payload TEXT,
    ui_id VARCHAR(50),
    status VARCHAR(20),
    message_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_by VARCHAR(50),
    confirmed_at TIMESTAMP
);
```

#### h_position
Position history.

```sql
CREATE TABLE h_position (
    position_id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL,
    x DECIMAL(10,2),
    y DECIMAL(10,2),
    yaw DECIMAL(10,2),
    timestamp TIMESTAMP,
    message_id VARCHAR(100)
);
```

#### h_battery
Battery history.

```sql
CREATE TABLE h_battery (
    battery_id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL,
    battery_level DECIMAL(5,2),
    voltage DECIMAL(5,2),
    timestamp TIMESTAMP,
    message_id VARCHAR(100)
);
```

---

### Master Tables

#### m_device
Robot devices.

```sql
CREATE TABLE m_device (
    device_id SERIAL PRIMARY KEY,
    device_name VARCHAR(100),
    robot_id VARCHAR(50) UNIQUE,
    device_type VARCHAR(50),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### m_map
Map metadata.

```sql
CREATE TABLE m_map (
    map_id SERIAL PRIMARY KEY,
    map_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER
);
```

---

### Deduplication

#### t_message_dedupe
Prevent duplicate Kafka message processing.

```sql
CREATE TABLE t_message_dedupe (
    message_id VARCHAR(100) PRIMARY KEY,
    processed_at TIMESTAMP DEFAULT NOW()
);
```

**Usage:** Before processing Kafka message, check if `message_id` exists. If yes, skip. If no, process and insert.

---

## ⚙️ Configuration

### application.properties

**Key Configurations:**

| Property | Default | Description |
|----------|---------|-------------|
| `server.port` | 8080 | API server port |
| `spring.datasource.url` | jdbc:postgresql://localhost:5432/tifa | PostgreSQL URL |
| `spring.kafka.bootstrap-servers` | localhost:9092 | Kafka brokers |
| `jwt.secret` | tifa-secret-key | JWT signing key |
| `jwt.expiration` | 86400000 | Token expiration (24h) |
| `file.upload.dir` | D:/data/maps | Map storage path |

---

## 🧪 Testing Guide

### 1. Test JWT Login

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### 2. Test Token Validation

```bash
curl -X POST http://localhost:8080/auth/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_JWT_TOKEN_HERE"
  }'
```

### 3. Test Goal Queue Creation (via Kafka)

Produce to `ui.command.op`:

```json
{
  "code": "OP",
  "data": {
    "robot_id": "RB001",
    "map_id": 1,
    "requested_by": 1,
    "tray_tasks": [
      { "tray": 1, "dest": { "x": 10.5, "y": 5.2, "yaw": 0.0 } },
      { "tray": 2, "dest": { "x": 15.0, "y": 8.0, "yaw": 1.57 } }
    ]
  }
}
```

Check database:
```sql
SELECT * FROM t_goal_queue ORDER BY created_at DESC LIMIT 1;
SELECT * FROM t_goal_queue_detail WHERE goal_queue_id = <queue_id>;
```

### 4. Test Auto-Dispatch

Simulate GOAL_COMPLETE from robot:

Produce to `robot.events.goal_complete`:
```json
{
  "code": "GOAL_COMPLETE",
  "data": {
    "robot_id": "RB001",
    "sequence": 1
  }
}
```

Backend should:
1. Mark sequence 1 as DONE
2. Dispatch sequence 2 automatically
3. Produce `be.command.dispatch_next_tray`

### 5. Test Pickup Confirmation

```bash
curl -X POST http://localhost:8080/api/delivery/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "robot_id": "RB001",
    "sequence": 1
  }'
```

### 6. Check Kafka Consumer Health

```bash
curl http://localhost:8080/actuator/health
```

Should show Kafka consumer status.

---

## 🔍 Troubleshooting

### Issue: Kafka Consumer Not Starting

**Solution:**
```bash
# Check Kafka is running
netstat -an | findstr 9092

# Check consumer group
kafka-consumer-groups.bat --bootstrap-server localhost:9092 \
  --describe --group tifa-backend-group
```

### Issue: Database Connection Failed

**Solution:**
- Verify PostgreSQL is running
- Check credentials in `application.properties`
- Test connection: `psql -U postgres -d tifa`

### Issue: JWT Token Expired

**Solution:**
- Re-login via `/auth/login`
- Increase `jwt.expiration` in config

---

**Project:** TIFA Backend API  
**Version:** 3.0.0  
**Spring Boot:** 2.7.18  
**Java:** 11  
**License:** Proprietary  


---

## Changelog

### v3.1 (2026-04-10) — Shared Services + Map Management

#### Phase 0: Code Refactoring

**New shared services** eliminate ~40 instances of copy-pasted inline JDBC code:

| Service | Purpose |
|---------|---------|
| `DeviceResolverService` | Unified `getOrCreateDeviceId()` — replaces 6 private copies across consumers |
| `WsTrafficLogger` | Unified `h_ws_traffic` INSERT — replaces inline SQL in 7 consumers |
| `MessageDedupeService` | Rewritten — was blocked by `@ConditionalOnProperty`, now correctly wired |

All 8 Kafka consumers refactored to inject these services:
`UICommandConsumer`, `RobotStateConsumer`, `RobotEventConsumer`, `RobotExpressionConsumer`,
`RobotCommandAckConsumer`, `ConnectionLogConsumer`, `DiagnosticConsumer`, `SHBConsumer`.

`WsTraffic` entity column names corrected to match actual DB schema (`code`, `payload`, `remote_addr`, `recorded_at`).

#### Phase 2: New Features

**`WsTrafficCatchAllConsumer`** — subscribes to:
- `ws.misc.ui` / `ws.misc.robot` — unrecognized codes from gateway fallback
- `ui.command.scs` — previously had topic but no consumer
- `ui.command.map_selected` — new map selection feature

All messages are logged to `h_ws_traffic` — **full audit coverage achieved**.

**New Map REST Endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /api/maps` | List all maps with destination count + latest version |
| `GET /api/maps/{id}/details` | Full map with destinations + categories (for IndexedDB sync in tifa-app) |
| `GET /api/maps/{id}/download/zip` | ZIP of all stored map files for ADB push to robot |

**`MapZipService`** — builds ZIP archives from `GFile` records in the latest `MapVersion`.

---

*Built with ❤️ for reliable robot service delivery*
