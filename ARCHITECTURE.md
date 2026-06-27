# Phase-Wise System Architecture & Telemetry Evolution

This document details the architectural design, telemetry structures, and data flows as they evolved across the development phases of the WSN platform.

---

## 1. System Layers Architecture (Decoupled & Agnostic)

The platform enforces strict modular boundaries. Downstream layers (Database, ML Pipeline, API Gateway, Dashboard) are completely decoupled from the telemetry source. Only the device layer changes as the system evolves:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        1. TELEMETRY SOURCE LAYER                       │
│  Phase 1: Python Virtual Node Process (OpenWeather API seed)            │
│  Phase 2: Simulated ESP32 on Wokwi Web Simulator (DHT22/BMP180 C++)    │
│  Phase 3: Physical ESP32 Microcontroller (DHT22/BMP180 C++ Target)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ MQTT Protocols (TCP Port 1883)
┌────────────────────────────────────────────────────────────────────────┐
│                        2. COMMUNICATION LAYER                          │
│  Phase 1: Local Mosquitto Broker (wsn/{city}/data & /status)           │
│  Phase 2 & 3: Public MQTT Broker (wsn_ahana_2026/<node_id>/data)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ Socket Ingestion (paho-mqtt)
┌────────────────────────────────────────────────────────────────────────┐
│                        3. DATA & INGESTION LAYER                       │
│  Ingestion Subscriber daemon (backend.py) + Watchdog timer             │
│  Persisted CSV logs (wsn_dataset.csv) + Digital Twin Shared State      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ Local Storage & JSON Bridging
┌────────────────────────────────────────────────────────────────────────┐
│                       4. ANALYTICS & API GATEWAY LAYER                 │
│  FastAPI (Uvicorn REST gateway)                                        │
│  Continuous Learning daemon (training_manager.py)                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ HTTP / REST Interfaces
┌────────────────────────────────────────────────────────────────────────┐
│                        5. PRESENTATION LAYER                           │
│  React NOC Dashboard (Mission Control SVG Topology, Live Events)       │
│  ML Operations Panel (Retraining tracking, R² validation, history)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase-Wise Telemetry Evolution & Data Flows

### 2.1 Phase 1: Pure Software Simulation
In Phase 1, all system components ran on the local host machine, using lightweight python mock nodes.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASE 1 TELEMETRY DATA FLOW                     │
│                                                                        │
│   [OpenWeather API] ──► [Virtual Node Script (node.py)]                │
│                               │                                        │
│                               ▼ MQTT over Localhost (Port 1883)        │
│                       [Mosquitto Broker]                               │
│                               │                                        │
│                               ▼ paho-mqtt socket                       │
│                      [backend.py Ingestor]                             │
│                               │                                        │
│                  ┌────────────┴────────────┐                           │
│                  ▼                         ▼                           │
│             [CSV Files]           [Live Data Buffer]                   │
│         data/*_history.csv       live_data_buffer (dict)               │
│                  │                         │                           │
│                  └────────────┬────────────┘                           │
│                               ▼                                        │
│                        [FastAPI Server]                                │
│                               │                                        │
│                               ▼ HTTP REST / polling                    │
│                      [React NOC Dashboard]                             │
└────────────────────────────────────────────────────────────────────────┘
```
- **Inputs**: Real diurnal temperature, humidity, and pressure conditions queried from the OpenWeather API for each target city.
- **Synthetics**: Node scripts injected mathematical decay models (Gaussian RSSI noise, linear battery discharge per packet, standard-deviation latency jitters).
- **Addressing**: Topic layout used city names directly: `wsn/{city}/data` and `wsn/{city}/status`.

---

### 2.2 Phase 2: Virtual Embedded Hardware Simulation
Phase 2 replaced the Python simulation script with standard Arduino C++ firmware executed within the cloud-based **Wokwi** ESP32 simulator.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASE 2 TELEMETRY DATA FLOW                     │
│                                                                        │
│   [Virtual Sensors] ──► [Wokwi ESP32 Simulator (C++ Sketch)]           │
│    (DHT22 & BMP180)           │                                        │
│                               ▼ Virtual Wi-Fi (Wokwi-GUEST AP)         │
│                       [broker.hivemq.com] (Public Broker)              │
│                               │                                        │
│                               ▼ TCP port 1883                          │
│                      [backend.py Ingestor]                             │
│                               │                                        │
│          ┌────────────────────┼────────────────────┐                   │
│          ▼                    ▼                    ▼                   │
│    [CSV Database]     [Digital Twin Store]   [ML Retrain Daemon]       │
│    wsn_dataset.csv     twins_state.json      training_manager.py       │
│          │                    │                    │                   │
│          └────────────────────┼────────────────────┘                   │
│                               ▼                                        │
│                       [FastAPI Routes]                                 │
│                   /api/live-data, /api/twins                           │
│                               │                                        │
│                               ▼ HTTP REST / polling                    │
│                      [React NOC Dashboard]                             │
│                        (Added: MLOps tab)                              │
└────────────────────────────────────────────────────────────────────────┘
```
- **Hardware Integration**: Virtual DHT22 and BMP180 sensors were wired to GPIO/I2C registers of a simulated ESP32 board.
- **Identity Decoupling**: Firmware queried its unique eFuse station MAC address to identify itself (`node_id = "mac"`). The C++ sketch publishes to generic topics: `wsn_ahana_2026/<mac_address>/data`.
- **Dynamic Registry Mapping**: The backend Node Registry parsed the topic, looked up the MAC address, and resolved the node metadata (Location, Coordinates, Sensor specifications) dynamically.
- **State Persistence**: Introduced the **Digital Twin** layer. `backend.py` updates in-memory states and saves snapshots to `twins_state.json` via thread-safe atomic swaps, allowing FastAPI (`uvicorn`) to read them.
- **Autonomous Learning**: Enabled a background **Training Manager** daemon that monitors row counts and timestamps, retraining linear and Gradient Boosting predictors automatically when trigger limits are met.

---

### 2.3 Phase 3: Physical Hardware Deployment
Phase 3 translates the validated virtual models to physical, real-world components in the field.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASE 3 TELEMETRY DATA FLOW                     │
│                                                                        │
│   [Physical Sensors] ──► [ESP32 DevKit Microchip (C++)]                │
│    (DHT22 & BMP180)           │                                        │
│                               ▼ Home / Campus Wi-Fi Link               │
│                       [Public/Private MQTT Broker]                     │
│                               │                                        │
│                               ▼                                        │
│                            (Same Ingestor, ML, Twin, API Layers)       │
└────────────────────────────────────────────────────────────────────────┘
```
- **Hardware Assembly**: A physical ESP32 DevKitC v4 wired to a DHT22 (GPIO 4) and a BMP180 sensor shield (I2C SDA 21, SCL 22).
- **Firmware Compilation**: The identical C++ code is compiled locally using **PlatformIO** and flashed onto the board over a USB cable.
- **Zero Downstream Changes**: The physical device publishes the same JSON payload format to the same MQTT topics. The registry, ingestor, twin file store, API endpoints, and dashboard run without modification.

---

## 3. Operations Lifecycles & State Flows

### 3.1 Digital Twin State Engine
The Digital Twin manager tracks node heartbeats to identify anomalies and transitions.

```text
                       +-------------------------+
                       |   nodes_registry.json   |
                       +------------┬------------+
                                    │
                                    ▼ (Startup Scaffold)
                       +-------------------------+
                       |     Status: OFFLINE     | (All metrics: None)
                       +------------┬------------+
                                    │
                                    ├◄─────────────────────────┐
                         [MQTT Status / Data Packet]           │
                                    ▼                          │
                       +-------------------------+             │
                       |     Status: ONLINE      |             │
                       |   (Heartbeat Active)    |             │
                       +------------┬------------+             │
                                    │                          │
                                    ├─► [data packet]          │
                                    │   Update Sensor readings │
                                    │   Update RSSI/Latency    │
                                    │   Recalculate Health     │
                                    │                          │
                 (watchdog timeout) │                          │
                  no packets > 45s  ▼                          │
                       +-------------------------+             │
                       |     Status: OFFLINE     |             │
                       |  (Watchdog Flagged)     |             │
                       +------------┬------------+             │
                                    │                          │
                                    └──────────────────────────┘
```

### 3.2 Continuous Learning Retraining Engine
```text
  [In-Memory Metric Evaluation]
  Evaluated every 15 seconds by training_manager.py
               │
               ▼
   Check trigger boundaries:
   - Dataset Growth: accumulated >= 500 new rows?
   - Elapsed Time: cooldown >= 24 hours?
               │
               ├─── [No]  ──► Wait (Skip Retrain Run)
               │
               └─── [Yes] ──► Train Candidate Model (80% dataset split)
                                    │
                                    ▼
                              Validate Model (20% dataset split)
                                    │
                                    ▼
                         Champion Comparison Test:
                      Is R² (Candidate) > R² (Active)?
                                    │
                     ┌──────────────┴──────────────┐
                     ▼ [No]                        ▼ [Yes]
              Reject Candidate              Deploy Candidate
             (Status: REJECTED)             (Status: ACTIVE)
             Log in registry.json           Overwrite active pickle (.pkl)
                                            Update MLOps table logs
```
