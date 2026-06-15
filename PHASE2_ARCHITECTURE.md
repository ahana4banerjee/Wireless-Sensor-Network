# Phase 2 System Architecture: Virtual Embedded Hardware Simulation

This document defines the architectural specifications, component boundaries, and data flow models for **Phase 2 (PICSimLab Hardware Simulation)** of the **Intelligent Wireless Sensor Network (WSN) Platform & Simulation** project. 

---

## 1. Introduction

### 1.1 Purpose of Phase 2
Phase 2 introduces a virtual embedded hardware layer to transition the telemetry generation source from Python scripts (Phase 1) to microcontroller firmware (C/C++) executed within the **PICSimLab** emulation sandbox. This step validates network interactions, hardware constraints, and memory allocation parameters of the embedded software prior to bare-metal physical flashing.

### 1.2 The Role of a Virtual Hardware Layer
Physical embedded development is constrained by testing bottlenecks, hardware availability, and unpredictable environmental variables. By introducing a virtual hardware layer:
*   Microchip instruction executions and socket connections are simulated deterministically.
*   Physical errors (e.g., memory exhaustion, packet loss, transmission latency) are evaluated systematically.
*   Firmware code portability is maximized while decoupling the physical layer from database, API, and client rendering blocks.

### 1.3 Position in the Development Roadmap
Phase 2 acts as a gatekeeper between high-level software simulation (Phase 1) and bare-metal field deployment (Phase 3). It validates the firmware code under the exact network, socket, and memory configurations that will govern the physical microchips.

```text
Phase 1: Software Simulation ──► Phase 2: Hardware Simulation ──► Phase 3: Physical ESP Node
(Python Virtual Processes)       (C/C++ Firmware inside MCU)     (Physical Silicon Flashing)
```

---

## 2. High-Level Architecture

The Phase 2 architecture decouples the physical hardware interface from downstream application logic by routing all telemetry packages through a centralized MQTT Mosquitto broker.

```text
                     +-----------------------------------+
                     |          PICSimLab Node           |
                     |  (Simulated ESP32 MCU Firmware)   |
                     +-----------------+-----------------+
                                       │
                                       ▼ Virtual network bridge
                     +-----------------+-----------------+
                     |          MQTT Publisher           |
                     |     (C++ PubSubClient Socket)     |
                     +-----------------+-----------------+
                                       │
                                       ▼ TCP Socket Port 1883 (wsn/+/+)
                     +-----------------+-----------------+
                     |        Mosquitto Broker           |
                     |       (Local Host Daemon)         |
                     +-----------------+-----------------+
                                       │
                                       ▼ Socket connection
                     +-----------------+-----------------+
                     |          Python Backend           |
                     |        (backend.py Daemon)        |
                     +-----------------+-----------------+
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
+-----------+-----------+                               +---------+---------+
|   Machine Learning    |                               |   FastAPI REST    |
| (Isolation Forest/GB) |                               |      Server       |
+-----------+-----------+                               +---------+---------+
            │                                                     │
            └──────────────────────────┬──────────────────────────┘
                                       ▼ HTTP Polling
                     +-----------------+-----------------+
                     |      React NOC Dashboard          |
                     |     (Vite Client Browser)         |
                     +-----------------------------------+
```

### 2.1 Layer Responsibilities
*   **PICSimLab Node**: Runs compiled C/C++ microchip instructions, reads virtual pins, and models local hardware/network constraints.
*   **MQTT Publisher**: Manages WiFi network association and MQTT client connections, packaging telemetry dictionaries into stack-allocated JSON payloads.
*   **Mosquitto Broker**: Operates as a lightweight TCP message broker routing heartbeats and metrics over wildcard topics.
*   **Python Backend**: Consumes topics asynchronously, writes local CSV log histories, computes gaps in sequence packages, and checks timeout parameters.
*   **ML & FastAPI**: Operates as the analysis and REST gatekeeper, calculating predictions and serving structured routes.
*   **React Dashboard**: Displays telemetry grids, diagnostic event cards, and SVG topology layouts.

---

## 3. Layered Architecture

The WSN system is organized into six distinct, decoupled architectural layers.

```text
+-----------------------------------------------------------------------------+
| PRESENTATION LAYER (React SPA / Recharts / SVG Node Topology)               |
+-----------------------------------------------------------------------------+
                                      ▲
                                      │ HTTP REST Polling
+-------------------------------------+---------------------------------------+
| REST GATEWAY API LAYER (FastAPI / Pydantic Schemas / CORS Middleware)       |
+-----------------------------------------------------------------------------+
                                      ▲
                                      │ File Read
+-------------------------------------+---------------------------------------+
| ANALYTICS & ML LAYER (Gradient Boosting / Isolation Forest / NHI Scoring)   |
+-----------------------------------------------------------------------------+
                                      ▲
                                      │ File Append
+-------------------------------------+---------------------------------------+
| DATA PROCESSING LAYER (python Ingestor / Stateful Watchdog / CSV Migrator)  |
+-----------------------------------------------------------------------------+
                                      ▲
                                      │ TCP Socket Subscription
+-------------------------------------+---------------------------------------+
| COMMUNICATION LAYER (Mosquitto MQTT Broker / Wildcard Topics / TCP 1883)    |
+-----------------------------------------------------------------------------+
                                      ▲
                                      │ MQTT Publish
+-------------------------------------+---------------------------------------+
| HARDWARE SIMULATION LAYER (PICSimLab ESP32 DevKitC / Virtual I2C & GPIO)    |
+-----------------------------------------------------------------------------+
```

### 3.1 Hardware Simulation Layer
*   **Responsibilities**: Simulates physical registers, registers ADC/DAC inputs, processes virtual peripheral (DHT11/BMP280) I/O events, and runs CPU loops.
*   **Why PICSimLab**: Provides instruction-level execution of ESP32 and ESP8266 processors, emulation of hardware timers, and virtual network bridging.
*   **Benefits**: Allows validation of hardware driver initializations and memory bounds in software, eliminating the risk of bricking physical IC chips during early testing.

### 3.2 Communication Layer
*   **MQTT Broker**: Connects publishers to subscribers over port 1883.
*   **QoS (Quality of Service)**: Configured at QoS level `0` (At most once delivery) to match the low-power constraints of real-world wireless sensor deployments.
*   **Publish/Subscribe Model**: Multi-client pub-sub separates data sources from ingestion clients.

### 3.3 Data Processing Layer
*   **Backend Subscriber**: Consumes incoming MQTT topics (`wsn/+/+`) and transforms raw JSON buffers into structured dictionary structures.
*   **CSV Engine**: Manages local data directories, maintaining rotating file handlers (`backend.log` and `alerts.log`) and executing CSV schema migrations.
*   **Watchdog & Diagnostics**: Computes timeout durations and evaluates telemetry points against hardware warning/critical parameters.

### 3.4 Analytics Layer
*   **ML Compatibility**: Trains and executes models asynchronously against persistent CSV databases, preventing computation latency from blocking REST API response loops.
*   **Anomaly Detection**: Fits Scikit-Learn `IsolationForest` models to atmospheric variables.
*   **Prediction Models**: Employs `GradientBoostingRegressor` to capture non-linear battery degradation and network latencies.
*   **Network Health**: Formulates a deterministic, explainable Network Health Index (NHI) score from battery, RSSI, latency, and packet loss metrics.

### 3.5 API Layer
*   **FastAPI**: Exposes async routes.
*   **Schema Preservation**: Validates inputs and responses against strict Pydantic model schemas, ensuring type compliance with front-end React services.

### 3.6 Presentation Layer
*   **React Dashboard**: Implements route-wise code splitting (lazy loading) and Visited Route CSS caching.
*   **Topology Rendering**: Animates SVG flow paths representing real-time link states and node health indexes.

---

## 4. Component Interaction Diagram

This diagram maps the sequence of component events from sensor reading up to client visualization:

```text
 PICSimLab       Virtual      Mosquitto       Python        CSV/Log       FastAPI        React
 ESP32 Node      Sensors       Broker        Backend        Storage       Gateway      Dashboard
     │              │             │             │              │             │             │
     │  Read GPIO   │             │             │              │             │             │
     ├─────────────►│             │             │              │             │             │
     │  Telemetry   │             │             │              │             │             │
     │◄─────────────┤             │             │              │             │             │
     │                            │             │              │             │             │
     │  Compute Battery/RSSI/Loss │             │              │             │             │
     ├──────────────────────────┐ │             │              │             │             │
     │                          │ │             │              │             │             │
     │◄─────────────────────────┘ │             │              │             │             │
     │                            │             │              │             │             │
     │     Publish JSON           │             │              │             │             │
     ├───────────────────────────►│             │              │             │             │
     │                            │  Ingest     │              │             │             │
     │                            ├────────────►│              │             │             │
     │                            │             │  Append      │             │             │
     │                            │             ├─────────────►│             │             │
     │                            │             │  Check Alert │             │             │
     │                            │             ├──────────────┼────────────►│             │
     │                            │             │              │             │             │
     │                            │             │  Run Models  │             │             │
     │                            │             ├──────────────┼─────────────┼────────────┐│
     │                            │             │  (Async ML)  │             │            ││
     │                            │             │◄─────────────┴─────────────┼────────────┘│
     │                            │             │                            │             │
     │                            │             │            GET /api/nodes  │             │
     │                            │             │◄───────────────────────────├─────────────┤
     │                            │             │            JSON Response   │             │
     │                            │             ├───────────────────────────►├─────────────┤
     │                            │             │                            │   Update    │
     │                            │             │                            │◄────────────┤
     │                            │             │                            │   Layout    │
     │                            │             │                            ├────────────►│
```

---

## 5. Node Internal Architecture

The C/C++ firmware is structured around decoupled internal managers:

```text
+---------------------------------------------------------------------------------+
|                                 FIRMWARE LOOP                                   |
|                                                                                 |
|  +----------------------+ +----------------------+ +-------------------------+  |
|  |    Sensor Manager    | |   Battery Manager    | |    Signal Simulator     |  |
|  |  (Reads DHT11/BMP280)| |  (Models degradation)| |  (Computes RSSI dBm)    |  |
|  +-----------┬----------+ +-----------┬----------+ +------------┬------------+  |
|              │                        │                         │               |
|              └──────────────────┐     │     ┌───────────────────┘               |
|                                 ▼     ▼     ▼                                   |
|                          +-------------------------+                            |
|                          | Packet Loss Simulator   |                            |
|                          |   (Transmission Drops)  |                            |
|                          +------------┬------------+                            |
|                                       │                                         |
|                                       ▼                                         |
|                          +-------------------------+                            |
|                          |      JSON Builder       |                            |
|                          | (Static Serialization)  |                            |
|                          +------------┬------------+                            |
|                                       │                                         |
|                                       ▼                                         |
|                          +-------------------------+                            |
|                          |       MQTT Client       |                            |
|                          |    (PubSubClient API)   |                            |
|                          +------------┬------------+                            |
|                                       │                                         |
|                                       ▼                                         |
|                          +-------------------------+                            |
|                          |      WiFi Manager       |                            |
|                          |   (WiFi Socket Stack)   |                            |
|                          +-------------------------+                            |
+---------------------------------------------------------------------------------+
```

### 5.1 Firmware Module Specifications
*   **Sensor Manager**: Wraps pin configurations and hardware drivers. Extracts floating-point values for temperature, humidity, and barometric pressure.
*   **Battery Manager**: Implements local decay logic, decreasing charge indices dynamically based on CPU state and wireless transmission activity.
*   **Signal Simulator**: Calculates distance-based signal attenuation values and adds random Gaussian noise.
*   **Packet Loss Simulator**: Checks dynamic loss coefficients. If a simulated packet is marked lost, it halts the transmission buffer before executing socket write procedures.
*   **JSON Builder**: Serializes diagnostic matrices using the stack-allocated `StaticJsonDocument` buffer format.
*   **MQTT Client**: Encapsulates connection state tracking, heartbeat updates, and keep-alive intervals.
*   **WiFi Manager**: Manages network socket initializations and background reconnection routines.

---

## 6. PICSimLab Integration Architecture

The PICSimLab environment provides complete hardware-in-the-loop validation of the node firmware:

```text
[ C/C++ Source Code ] ──► [ PlatformIO Compiler ] ──► [ Binary .bin File ]
                                                             │
                                                             ▼ (Flash via UART)
+------------------------------------------------------------------------+
|                      PICSimLab ESP32 DevKitC BOARD                     |
|                                                                        |
|   +-----------------------+              +-----------------------+     |
|   |  Virtual DHT11 Sensor |              | Virtual BMP280 Sensor |     |
|   +-----------┬-----------+              +-----------┬-----------+     |
|               │ GPIO 4                               │ I2C SDA/SCL     |
|               └───────────────────┐      ┌───────────┘                 |
|                                   ▼      ▼                             |
|                           +────────────────+                           |
|                           | Extensa LX6    |                           |
|                           | CPU Core       |                           |
|                           +────────┬───────+                           |
|                                    │                                   |
|                                    ▼ Virtual Serial/Sockets            |
|                           +────────────────+                           |
|                           | WiFi Module    |                           |
|                           +--------┬-------+                           |
+------------------------------------|-----------------------------------+
                                     │
                                     ▼ Virtual Network Adapter Bridge
                            [ Local Host Interface ]
                                     │
                                     ▼ TCP Port 1883
                            [ MQTT Mosquitto Broker ]
```

### 6.1 Simulation Mechanics
*   **Instruction Emulation**: The simulator parses compiled ESP32 binary files, simulating processor operations, register changes, and stack spaces.
*   **Virtual Network Bridging**: PICSimLab hooks into the host operating system's networking configurations. By assigning simulated MCUs virtual IP addresses, the nodes interface with host TCP ports, enabling communication with the Mosquitto broker.

---

## 7. Data Flow Architecture

The step-by-step lifecycle of telemetry data is defined below:

```text
                     +---------------------------+
                     |         MCU BOOT          |
                     +-------------┬-------------+
                                   │
                                   ▼
                     +---------------------------+
                     |  Initialize GPIO / I2C    |
                     +-------------┬-------------+
                                   │
                                   ▼
                     +---------------------------+
                     | Connect WiFi Network Stack|
                     +-------------┬-------------+
                                   │
                                   ▼
                     +---------------------------+
                     | Connect MQTT Socket (1883)|
                     +-------------┬-------------+
                                   │
                                   ▼
                     +---------------------------+
                     | Fetch Sensor Diagnostics  |
                     +-------------┬-------------+
                                   │
                                   ▼
                     +---------------------------+
                     |   Compute ECE WSN Models  |
                     +-------------┬-------------+
                                   │
                                   ▼
                     +---------------------------+
                     | Serialize stack JSON      |
                     +-------------┬-------------+
                                   │
                                   ▼
                     +---------------------------+
                     |   Publish Status/Data     |
                     +-------------┬-------------+
                                   │
                                   ▼
                     +---------------------------+
                     | Ingest & Standardize CSV  |
                     +-------------┬-------------+
                                   │
                                   ▼
                     +---------------------------+
                     | Run Anomaly / GB ML Models|
                     +-------------┬-------------+
                                   │
                                   ▼
                     +---------------------------+
                     |   FastAPI REST Gateways   |
                     +-------------┬-------------+
                                   │
                                   ▼
                     +---------------------------+
                     |  React client NOC Render  |
                     +---------------------------+
```

---

## 8. MQTT Communication Architecture

### 8.1 Topic Hierarchy
The communication channel uses a two-tier directory layout to organize metrics by node origin and diagnostic severity:

```text
wsn/
├── Hyderabad/
│      ├── status                # Heartbeat status topics
│      └── data                  # Environment telemetry topics
├── Delhi/
│      ├── status
│      └── data
├── Mumbai/
│      ├── status
│      └── data
├── Bangalore/
│      ├── status
│      └── data
└── Secunderabad/
       ├── status
       └── data
```

### 8.2 Channel Protocol Split
*   **Heartbeat Payload (`status`)**: Dispatched at high frequency (20-second interval) to maintain watchdog online indicators. Contains basic connectivity statuses, sequence counts, battery levels, and signal scores.
*   **Telemetry Payload (`data`)**: Dispatched at low frequency (60-second interval). Contains the complete weather parameter list alongside the system health matrices.

This split protects local node batteries by avoiding the heavy processing costs of reading sensors and transmitting larger payloads during every heartbeat checkpoint.

---

## 9. Hardware Abstraction Model

A core architectural principle of this system is that **everything above the MQTT layer is hardware-agnostic**. The data formats, topics, database structures, and visualization views remain identical, while the telemetry generation source changes.

```text
+-----------------------+
|  Python Virtual Node  | ──┐
+-----------------------+   │
                            │
+-----------------------+   │ (Identical JSON Schema
|  PICSimLab ESP32 Node | ──┼──► wsn/{city}/data & wsn/{city}/status)
+-----------------------+   │
                            │
+-----------------------+   │
|   Physical ESP Node   | ──┘
+-----------------------+
                            │
                            ▼
                +-----------------------+
                | Mosquitto Broker 1883 |
                +-----------┬-----------+
                            │
                            ▼
                +-----------------------+
                |  Subscriber Backend  |
                +-----------------------+
```

### 9.1 Advantages of the Abstraction Model
*   **Low Coupling**: Modifying firmware registers does not alter Python ingestion logic, API models, or dashboard screens.
*   **High Maintainability**: Upgrades to the analytics dashboard can be developed and deployed without interrupting the operational field nodes.
*   **Firmware Portability**: Validated C++ classes migration path from simulation to physical microchips is seamless.
*   **Reusable Infrastructure**: The database, ML classifiers, FastAPI paths, and React layout assets are built once and reused across all three phases of the project roadmap.

---

## 10. Repository Architecture

The repository layout preserves the pre-existing simulation configurations, introducing the new Phase 2 C++ files within the `firmware/` root workspace directory.

```text
Wireless-Sensor-Network/
├── configs/                     # System configuration settings
│   └── settings.json            # Dynamic simulation parameters synced via API
├── dashboard/                   # React frontend application
│   ├── src/                     # React source directory
│   │   ├── components/          # Reusable dashboard pages and UI helpers
│   │   └── App.jsx              # Main routing and dynamic lazy-loading
│   └── vite.config.js           # Vite build parameters
├── data/                        # Processed databases and logs directory
│   ├── logs/                    # Rotating system and alert files
│   └── processed/               # Aggregated database records (wsn_dataset.csv)
├── firmware/                    # Phase 2 Microcontroller C/C++ Firmware (NEW)
│   ├── common/                  # Shared driver and network classes
│   │   ├── config.h             # Connection constants definition
│   │   ├── wifi_manager.h       # WiFi reconnect class prototype
│   │   ├── wifi_manager.cpp     # WiFi class implementation
│   │   ├── mqtt_manager.h       # MQTT JSON serialization header
│   │   ├── mqtt_manager.cpp     # MQTT class method definitions
│   │   ├── sensor_driver.h      # Physical sensor wrapper header
│   │   ├── sensor_driver.cpp    # Sensor reader implementation
│   │   ├── metrics_model.h      # Math models calculator class
│   │   └── metrics_model.cpp    # Math models calculations code
│   └── nodes/                   # Project workspaces for simulated nodes
│       ├── bangalore/           # Bangalore virtual board project
│       ├── delhi/               # Delhi virtual board project
│       ├── hyderabad/           # Hyderabad virtual board project
│       ├── mumbai/              # Mumbai virtual board project
│       └── secunderabad/        # Secunderabad virtual board project
├── models/                      # Pickled ML models (Regression & Isolation Forest)
├── reports/                     # Model metrics reports and analytics summaries
├── scratch/                     # Temporary and verification scripts
│   ├── test_demo_mode.py        # Demo Mode verification script
│   └── test_settings_api.py     # Settings schema and bounds check script
├── src/                         # Backend Python scripts
│   ├── api/                     # FastAPI routing and controller logic
│   ├── backend.py               # MQTT subscriber backend and watchdog
│   └── node.py                  # WSN virtual sensor node simulator
├── main.py                      # Multi-node launch orchestrator
└── REQUIREMENTS.txt             # Python project dependencies
```

---

## 11. Engineering Decisions

*   **MQTT (Protocol choice)**: Employs a publish-subscribe model. Unlike HTTP POST, MQTT is optimized for constrained, high-latency, low-bandwidth wireless sensor environments, drastically reducing battery drain on physical nodes.
*   **PICSimLab (Simulator choice)**: Enables validation of C++ MCU architectures, network socket stacks, memory allocation routines, and hardware registers inside a software sandbox.
*   **Hardware Abstraction (Design choice)**: Minimizes project design bottlenecks, allowing database, backend, and dashboard layers to remain identical throughout the development lifecycle.
*   **Decoupled Backend (Decentralized design)**: Ensures the telemetry subscribers and REST gateways operate independently, preventing high-frequency message queues from blocking user interactions.

---

## 12. Scalability Model

The decoupled architecture scales easily to meet growing operational demands:

*   **Scaling Nodes**: To register a new city node, developers copy a new configuration project inside `nodes/`, updating the target `city` parameter. The backend automatically detects the new MQTT publisher, initializes its history CSV file, and scales watchdog tracking loops.
*   **Adding Sensors**: Incorporating new metrics (e.g., wind direction or soil moisture) involves modifying the JSON dictionary in the C++ firmware. The backend subscriber automatically handles schema updates, updating headers dynamically.
*   **Integrating Different Microcontrollers**: Firmware modules target PlatformIO libraries, allowing compilation for ESP8266, ESP32-S3, or STM32 processors without modifying the backend.

---

## 13. Reliability and Fault Tolerance

*   **Node Outage Detection**: If a node fails to publish a status heartbeat for longer than the timeout threshold ($\text{heartbeat\_interval} \times 3$), the stateful watchdog flags the node as `OFFLINE`. It appends a critical alert to `alerts.log` and changes the topology link color on the dashboard to solid red.
*   **State Resolution**: Upon receiving a new heartbeat from an offline node, the backend detects the check-in, resolves the outage, logs a `RESOLVED` status alert, and restores the topology link.
*   **Dynamic Data Persistence**: Telemetry entries are written directly to separate CSV files, preventing database corruption from affecting the rest of the node datasets.

---

## 14. Migration Architecture for Phase 3

Transitioning from Phase 2 simulated hardware to Phase 3 physical silicon requires no software redesign:

```text
  [ PlatformIO Code Base ]
             │
      ┌──────┴──────┐
      ▼ (Simulate)  ▼ (Deploy)
[ PICSimLab ESP32 ] [ Physical ESP32 Node ]
      │                     │
      └──────┬──────────────┘
             ▼ WiFi Connection
[ Mosquitto Broker Port 1883 ]
             │
             ▼ TCP Socket
[ Python Ingestion Subscriber ]
             │
             ▼ REST Queries
[ React NOC dashboard UI ]
```

The validated C++ code is flashed directly to physical microchips. The WiFi and MQTT credentials inside `common/config.h` are updated to match the local physical router and the gateway IP address of the production server.

---

## 15. Architectural Advantages

*   **Reduced Development Cost**: Testing and refining ML predictors and visualizations can be completed entirely on local host workstations, bypassing the need for physical hardware during early design iterations.
*   **Faster Debugging**: Firmware logic (such as memory leaks, JSON formatting errors, and clock drifts) is caught in the PICSimLab emulator, saving hours of serial monitoring on physical microcontrollers.
*   **Lower Hardware Dependency**: System design validation is decoupled from physical device availability.
*   **Enterprise-Grade Modularity**: Strict interface boundaries between physical emulations, network layers, database handlers, and visualization front-ends follow modern IoT and software design patterns.
