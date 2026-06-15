# Phase 2 System Design: PICSimLab Hardware Simulation Layer

This document establishes the technical design specification and system architecture for **Phase 2** of the **Intelligent Wireless Sensor Network (WSN) Platform & Simulation** project. 

---

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to detail the transition from software-based virtual sensor nodes (Phase 1) to virtual embedded hardware nodes running inside the **PICSimLab** emulator (Phase 2).

### 1.2 Scope
This document covers:
*   The hardware simulation architecture using **PICSimLab**.
*   The C/C++ firmware module structure for virtual microcontrollers.
*   Telemetry payloads, JSON schemas, and topic routing definitions.
*   Mathematical WSN constraint modeling (battery, signal noise, latency, packet loss) implemented in embedded C/C++.
*   Compatibility specifications guaranteeing zero downtime or rewriting of the FastAPI backend, Mosquitto MQTT broker, and React dashboard.
*   Blueprints for migration to physical hardware (Phase 3).

### 1.3 Motivation
Developing firmware directly on bare-metal hardware (e.g., ESP8266 or ESP32) introduces high debugging latency, deployment friction, and signal reproducibility issues. Physical constraints like RF propagation paths, packet drops, and battery depletion curves are hard to control or repeat in lab testing. 

Phase 2 solves this by introducing a **Hardware Simulation Layer**. Firmware is written in standard microcontroller C/C++ and executed on simulated microchips inside PICSimLab. The virtual chips interact with virtualized peripherals (sensors) and establish network sockets to publish MQTT metrics to the local broker. This allows full embedded validation in a reproducible sandbox before deploying physical hardware.

---

## 2. Design Objectives

Phase 2 is guided by the following core ECE and software design objectives:

*   **Hardware Abstraction**: Standardize node interactions over MQTT. The data ingestion engine and rest-gateways must remain completely agnostic of the telemetry source, whether it is a Python simulator, PICSimLab virtual board, or real ESP32 silicon.
*   **Modular Firmware Design**: Structured around an ECE firmware library dividing WiFi connection, MQTT subscription/publication, sensor driver abstraction, and battery/network simulation into distinct, unit-testable C/C++ classes.
*   **Embedded Validation**: Verify MCU network stacks, payload serialization sizes, watchdog timer constraints, and memory leak vulnerabilities (especially under dynamic JSON generation) before bare-metal deployment.
*   **Decoupled Extensibility**: Ensure that updating simulation variables (e.g., scaling packet drop rates or battery decay factors) does not break backend Pydantic validators or frontend visual layers.
*   **Future Migration Portability**: Target standard hardware development kits (like the Espressif ESP32-DevKitC or NodeMCU ESP8266) within the firmware libraries to allow flashing the same source code directly to real chips during Phase 3.

---

## 3. Architectural Philosophy

The architecture adheres to a strict **modularity-first** and **simulation-first** methodology. The central telemetry hub (the MQTT Mosquitto broker) defines a hardware-agnostic communication boundary. The three-phase transition is illustrated below:

```text
                  +-----------------------------------+
                  |      Phase 1: Python Nodes        |
                  | (Virtual python processes loop)   |
                  +-----------------+-----------------+
                                    |
                                    v (Publish MQTT Payload)
+-----------------------------------+-----------------------------------+
|                  Phase 2: PICSimLab Hardware Simulation               |
|  (C/C++ firmware in simulated ESP32 DevKitC -> Virtual MQTT Sockets)  |
+-----------------------------------+-----------------------------------+
                                    |
                                    v (Publish MQTT Payload)
                  +-----------------+-----------------+
                  |       Phase 3: Physical ESP32     |
                  | (Bare-metal silicon deployment)   |
                  +-----------------+-----------------+
                                    |
                                    v [wsn/{city}/data & wsn/{city}/status]
                  +-----------------+-----------------+
                  |      Centralized MQTT Broker      |
                  |     (Mosquitto Local Port 1883)   |
                  +-----------------+-----------------+
                                    |
                                    v (Ingest)
                  +-----------------+-----------------+
                  |   Python Subscriber & Ingestor    |
                  +-----------------+-----------------+
                                    |
                                    v (REST Gateway)
                  +-----------------+-----------------+
                  |        FastAPI REST Server        |
                  +-----------------+-----------------+
                                    |
                                    v (Visualize)
                  +-----------------+-----------------+
                  |     React WSN NOC Dashboard       |
                  +-----------------------------------+
```

By maintaining static MQTT topic boundaries and strict JSON structures, the upstream infrastructure is shielded from the physical evolution of the node. Only the leaf node implementation shifts from Python scripts to C/C++ microchip instructions.

---

## 4. Functional Overview

In Phase 2, the Python node process (`main.py` launching multiple `node.py` processes) is retired. Instead, **PICSimLab** runs five concurrent virtual boards, representing Bangalore, Delhi, Hyderabad, Mumbai, and Secunderabad. 

Each virtual board executes compiled firmware performing the following tasks:
1.  **Boot & Peripheral Verification**: Configures I/O pins, serial ports, and registers virtual environmental sensors (DHT11/BMP280).
2.  **WiFi Connectivity**: Connects to the host machine's virtual network interface, simulating a local router association.
3.  **MQTT Handshake**: Connects to the local Mosquitto MQTT broker on the host gateway IP.
4.  **High-Frequency Status Loop**: Computes and publishes node connectivity status and battery status over wildcard telemetry topics every 20 seconds.
5.  **Low-Frequency Data Loop**: Polls weather sensors, wraps metrics inside JSON strings, and publishes payloads over wildcard telemetry data topics every 60 seconds.
6.  **Simulation Layer Modeling**: Evaluates internal mathematical functions representing RSSI path loss, latency, battery consumption, and packet drops.

---

## 5. PICSimLab Environment

### 5.1 Virtual Boards
The hardware simulation relies on the PICSimLab simulator, utilizing the following configuration:
*   **Virtual Board**: `ESP32-DevKitC` (or `NodeMCU` for ESP8266 emulation).
*   **Processor Core**: Extensa LX6 dual-core MCU (simulated instruction set).
*   **Memory Profile**: 520 KB SRAM, 4MB SPI Flash.
*   **Virtual Interface**: Integrated serial UART (`/dev/ttyS*` or `COM*` via virtual serial ports) and simulated IEEE 802.11 b/g/n WiFi module.

### 5.2 Sensor Emulation
Peripherals are simulated using PICSimLab's "Spare Parts" interface or hardware script bindings:
*   **DHT11/DHT22 Temperature & Humidity Sensor**: Connected to GPIO Pin 4. Registers relative humidity and Celsius values.
*   **BMP280 Barometric Pressure Sensor**: Connected via the I2C bus (SDA: Pin 21, SCL: Pin 22) at address `0x76` or `0x77`.
*   **Simulated Inputs**: To simulate natural meteorological drifts, the firmware can accept seed parameters via the virtual serial port, or read virtual potentiometers connected to ADC pins (e.g., Pin 34) mapped to weather limits.

### 5.3 Firmware Compilation & Flashing Workflow
The firmware is developed using the **Arduino Framework** or **Espressif IoT Development Framework (ESP-IDF)** in VS Code with PlatformIO:

```text
[ C/C++ Firmware Code ]
         │
         ▼ (PlatformIO Build / Compile)
[ .bin / .hex Binary Files ]
         │
         ▼ (PICSimLab Loader Tool)
[ Load HEX / Bin to simulated ESP32 Board ]
         │
         ▼ (Execute Simulation)
[ Virtual Board interacts with MQTT Broker via Host Network Bridging ]
```

---

## 6. Virtual Hardware Components

To ensure the firmware mirrors the real physical constraints modeled in Phase 1, the C++ code embeds equivalent physical calculators:

### 6.1 MCU Core
Simulates the core ESP32/ESP8266 execution loops, utilizing hardware timers to split the high-frequency heartbeat cycles from low-frequency data cycles without using blocking `delay()` functions that disrupt network socket listeners.

### 6.2 WiFi Stack & Host Network Bridge
Employs standard `WiFi.h` libraries. The PICSimLab emulator bridges the host system's loopback or ethernet interface, assigning a virtual IP to the simulated board so it can establish TCP connections with the Mosquitto broker on `127.0.0.1:1883` or `192.168.x.x`.

### 6.3 MQTT Client Stack
Uses the standard `PubSubClient.h` library. Manages socket reconnect loops, payload size allocations (maximum packet buffer size set to 512 bytes), and handles keep-alive intervals.

### 6.4 Sensor Driver Abstractions
Utilizes standard driver libraries:
*   `DHT.h` for DHT11 data read logic.
*   `Adafruit_BMP280.h` for I2C atmospheric pressure measurements.

### 6.5 Battery Depletion Model
The firmware tracks virtual battery state via state-dependent decay equations, writing records to the microcontroller's RTC memory or simulating standard RAM variables:
$$\text{Battery}_{\text{new}} = \text{Battery}_{\text{prev}} - (\text{Idle Discharge} \times \Delta t) - \text{Cost}_{\text{event}}$$

Where:
*   $\text{Idle Discharge} = 0.01\%$ per second.
*   $\text{Cost}_{\text{heartbeat}} = 0.1\%$ per transmission.
*   $\text{Cost}_{\text{data}} = 0.5\%$ per meteorological read and transmission.
*   **Depletion Reset**: Once the battery hits $0.0\%$, the node switches status to `OFFLINE` and halts execution for one data cycle, simulating a technician replacing the physical battery cell in the field, before resetting to $100.0\%$.

### 6.6 RSSI Propagation Model
Simulates Distance-based Signal Strength Indication (RSSI) by implementing a path loss algorithm combined with Gaussian noise:
$$\text{RSSI} = \text{RSSI}_{\text{baseline}} + \mathcal{N}(0, \sigma_{\text{noise}})$$

Where the baseline and noise variables are loaded from the configuration (e.g., baseline = $-60.0$ dBm, standard deviation = $3.0$ dB).

### 6.7 Network Loss & Latency Simulation
To evaluate backend resiliency, the node simulates network degradation before broadcasting:
*   **Packet Loss**: A random percentage check matches the configured `packet_loss_rate`. If the check fails, the firmware short-circuits the publish sequence, skipping packet transmission to simulate RF dropout.
*   **Latency Delay**: Introduces a non-blocking delay before publishing using dynamic timers matching:
    $$\text{Delay}_{\text{ms}} = \text{random}(0, \text{max\_delay\_ms})$$

---

## 7. Communication Architecture

### 7.1 Topic Registry
Nodes communicate asynchronously using two MQTT topics:
1.  **Status Channel**: `wsn/{city}/status` (High frequency - Heartbeat check-in).
2.  **Data Channel**: `wsn/{city}/data` (Low frequency - Weather parameters).

Where `{city}` is replaced with the configured node identifier (e.g., `Delhi`, `Mumbai`, `Bangalore`, `Hyderabad`, or `Secunderabad`).

### 7.2 Protocol Payload Split
To optimize transmission bandwidth over constrained WSN links, status reports publish lightweight diagnostic dictionaries while weather cycles publish full payloads:

```text
                     +---------------------------+
                     |  Microcontroller Loop     |
                     +-------------+-------------+
                                   |
           ┌───────────────────────┴───────────────────────┐
           │ (Every 20 seconds)                            │ (Every 60 seconds)
           ▼                                               ▼
[ Format Status Payload ]                       [ Format Data Payload ]
   - battery_level                                 - temp, humidity, pressure
   - signal_strength                               - battery, signal, latency
   - latency, seq_num                              - weather condition, seq_num
           │                                               │
           ▼                                               ▼
   Publish to: wsn/{city}/status                   Publish to: wsn/{city}/data
```

---

## 8. Telemetry Schema

The JSON payloads generated by the C/C++ firmware must match the schemas expected by the Python subscriber backend.

### 8.1 Status Heartbeat Payload (`wsn/{city}/status`)
```json
{
  "node_id": "Bangalore",
  "status": "ONLINE",
  "ts": 1781285040.0,
  "seq_num": 142,
  "metrics": {
    "battery_level": 98.40,
    "signal_strength": -65.20,
    "latency_ms": 23.40,
    "seq_num": 142
  }
}
```

### 8.2 Data Telemetry Payload (`wsn/{city}/data`)
```json
{
  "node_id": "Bangalore",
  "ts": 1781285040.0,
  "seq_num": 142,
  "metrics": {
    "temp": 24.50,
    "feels_like": 25.10,
    "humidity": 68.00,
    "pressure": 1012,
    "wind_speed": 3.40,
    "visibility": 10000,
    "battery_level": 98.40,
    "signal_strength": -65.20,
    "latency_ms": 23.40,
    "seq_num": 142
  },
  "condition": "Clouds"
}
```

### 8.3 Schema Rules & Type Constraints
*   `node_id` (String): Must match the city name exactly. Used as the folder and CSV key.
*   `ts` (Double/Float): Unix Epoch Timestamp (in seconds). Since MCUs lack NTP sync by default in bare metal, the simulated ESP32 queries local NTP servers on boot, or the simulator injects the host's system time via serial triggers.
*   `seq_num` (Integer): Incremental packet counter used by the subscriber to compute packet loss.
*   `metrics` (Object): Contains the sensor telemetry. All float values should be rounded to 2 decimal places to minimize payload sizes.

---

## 9. Complete System Architecture

The end-to-end data pipeline from virtual hardware simulator down to the client visual dashboard operates as follows:

```text
+-----------------------------------------------------------------------------------------+
|                                 SIMULATED HARDWARE LAYER                                |
|                                                                                         |
|   +-----------------------+              +-----------------------+                      |
|   | Simulated DHT11 Temp  |              | Simulated BMP280 Pres |                      |
|   +-----------┬-----------+              +-----------┬-----------+                      |
|               │ GPIO Pin 4                           │ I2C Bus                          |
|               └───────────────────┐      ┌───────────┘                                  |
|                                   ▼      ▼                                              |
|                      +----------------────────+                                         |
|                      |  ESP32 DevKitC Node    |                                         |
|                      | (Firmware in C/C++)    |                                         |
|                      +------------┬-----------+                                         |
|                                   │                                                     |
|                                   │ Wifi Socket Bridge (Host Net Dev)                   |
+-----------------------------------|-----------------------------------------------------+
                                    │
                                    ▼ Port 1883 [wsn/+/+]
                       +----------------────────+
                       | Mosquitto MQTT Broker  |
                       +------------┬-----------+
                                    │
                                    ▼ Client Socket
                       +----------------────────+
                       | Python Subscriber      |
                       | (backend.py daemon)    |
                       +──┬──────────────────┬──+
                          │                  │
                          ▼ (Append logs)    ▼ (Diagnostic Alarms)
    +───────────────────────────+      +───────────────────────────+
    | Node History CSV Tables   |      | alerts.log Diagnostic Database |
    | data/logs/{city}_hist.csv |      | data/logs/alerts.log      |
    +─────────────┬─────────────+      +───────────────────────────+
                  │                                  │
                  └─────────────────┬────────────────┘
                                    ▼ (ML Predictions)
                       +----------------────────+
                       | Machine Learning Layer |
                       | (Gradient Boosting)    |
                       +------------┬-----------+
                                    │
                                    ▼ (Database read)
                       +----------------────────+
                       |  FastAPI REST Gateway  |
                       | (Pydantic validations) |
                       +------------┬-----------+
                                    │
                                    ▼ REST Polling / HTTP
                       +----------------────────+
                       | React NOC Dashboard    |
                       | (Vite client UI)       |
                       +------------------------+
```

---

## 10. Firmware Architecture

To enforce clean modular compilation, the C/C++ firmware is structured as reusable modules:

```text
firmware/
├── common/                      # Reusable core hardware driver modules
│   ├── config.h                 # Default parameters, topic configurations
│   ├── wifi_manager.h           # WiFi class prototype (reconnect loops)
│   ├── wifi_manager.cpp         # WiFi implementation code
│   ├── mqtt_manager.h           # MQTT client packaging class
│   ├── mqtt_manager.cpp         # MQTT client methods
│   ├── sensor_driver.h          # Abstracted DHT/BMP interface drivers
│   ├── sensor_driver.cpp        # Driver read helper routines
│   ├── metrics_model.h          # Battery decay, RSSI noise, network latency code
│   └── metrics_model.cpp        # Computational metrics estimators
└── nodes/                       # City-specific node projects
    ├── bangalore/               # Bangalore node workspace
    │   └── main.cpp             # Specific setup configurations for Bangalore
    ├── delhi/                   # Delhi node workspace
    │   └── main.cpp             # Specific setup configurations for Delhi
    ├── hyderabad/               # Hyderabad node workspace
    │   └── main.cpp             # Specific setup configurations for Hyderabad
    ├── mumbai/                  # Mumbai node workspace
    │   └── main.cpp             # Specific setup configurations for Mumbai
    └── secunderabad/            # Secunderabad node workspace
        └── main.cpp             # Specific setup configurations for Secunderabad
```

### 10.1 Common Library Modules

#### `config.h`
Defines base constants shared across all regional workspaces:
```cpp
#ifndef CONFIG_H
#define CONFIG_H

#define WIFI_SSID "Virtual_Router"
#define WIFI_PASS "Simulated_Key_2026"
#define MQTT_BROKER "192.168.1.100" // Host gateway IP
#define MQTT_PORT 1883
#define HEARTBEAT_INTERVAL_SEC 20
#define DATA_INTERVAL_SEC 60

#endif
```

#### `wifi_manager.h`
Abstracts connection states and handles background reconnect routines:
```cpp
#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

class WiFiManager {
public:
    WiFiManager(const char* ssid, const char* password);
    void begin();
    bool isConnected();
    void keepAlive();
private:
    const char* _ssid;
    const char* _password;
    void connect();
};

#endif
```

#### `mqtt_manager.h`
Wraps the MQTT client and serializes telemetry packets into compliant JSON using the `ArduinoJson` library:
```cpp
#ifndef MQTT_MANAGER_H
#define MQTT_MANAGER_H

#include <PubSubClient.h>
#include <WiFi.h>

class MQTTManager {
public:
    MQTTManager(WiFiClient& wifiClient, const char* broker, int port);
    void begin();
    bool connect(const char* clientId);
    void loop();
    bool publishStatus(const char* city, float battery, float rssi, float latency, int seq);
    bool publishData(const char* city, float temp, float hum, float pres, float battery, float rssi, float latency, int seq, const char* cond);
private:
    PubSubClient _client;
    const char* _broker;
    int _port;
};

#endif
```

#### `metrics_model.h`
Encapsulates ECE mathematical formulas calculating RSSI variance, latency delay, and state-dependent battery depletion coefficients:
```cpp
#ifndef METRICS_MODEL_H
#define METRICS_MODEL_H

class MetricsModel {
public:
    MetricsModel(float batteryBaseline, float rssiBaseline, float noiseStdDev);
    void updateBattery(unsigned long elapsedMs, const char* eventType);
    float getBatteryLevel();
    float getRSSI();
    float getLatency(float maxDelayMs);
    bool isLost(float lossRate);
    void resetBattery();
private:
    float _batteryLevel;
    float _rssiBaseline;
    float _noiseStdDev;
};

#endif
```

---

## 11. Repository Structure

The Phase 2 simulation components are integrated cleanly into the root layout as **additive changes** in the [`firmware/`](file:///d:/Projects/College/Wireless-Sensor-Network/firmware/) and [`scratch/`](file:///d:/Projects/College/Wireless-Sensor-Network/scratch/) directories. 

The complete, updated tree matches the blueprint below:

```text
Wireless-Sensor-Network/
├── configs/                     # System-wide configuration settings
│   └── settings.json            # Dynamic simulation parameters synced via API
├── dashboard/                   # React frontend application
│   ├── dist/                    # Compiled production client assets
│   ├── src/                     # React source directory
│   │   ├── components/          # Reusable dashboard pages and ui helpers
│   │   ├── services/            # API services mapping rest gateways
│   │   └── App.jsx              # Main routing and lazy-loading components
│   └── vite.config.js           # Vite server parameters
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
│   │   ├── routes/              # Sub-routers for nodes, settings, etc.
│   │   ├── demo.py              # Stateless portfolio demo replay engine
│   │   ├── schemas.py           # Pydantic data validation models
│   │   └── main.py              # API server entrypoint
│   ├── ml/                      # Machine learning training scripts
│   ├── backend.py               # MQTT subscriber backend and watchdog
│   └── node.py                  # WSN virtual sensor node simulator
├── main.py                      # Multi-node launch orchestrator
├── REQUIREMENTS.txt             # Python project dependencies
├── ARCHITECTURE.md              # System data flows documentation
├── CONTEXT.md                   # Single source of truth file
├── PHASE2_SYSTEM_DESIGN.md      # Phase 2 Design Specification (this document)
└── README.md                    # Primary public entrypoint documentation
```

---

## 12. Backend Compatibility

A major success indicator of the Phase 2 system design is that the upstream processing pipeline requires **zero modifications**:

*   **MQTT Ingestor (`backend.py`)**: Subscribes to `wsn/+/+` and expects JSON strings. Since the ESP32 firmware publishes the identical syntax on the same paths, `backend.py` parses the telemetry, processes packet loss gaps, and appends to CSV databases seamlessly.
*   **watchdog Timer**: Evaluates node health by comparing the elapsed time of heartbeats. The ESP32's `publishStatus` messages over `wsn/{city}/status` satisfy watchdog timers identically to the original Python node broadcasts.
*   **Database Schema (`wsn_dataset.csv`)**: Row appending, column mapping, and database migrations are preserved.
*   **Machine Learning Models**: The pickled scikit-learn anomaly forest and predictors ingest rows from the CSV database, completely decoupled from the sensor node network interfaces.
*   **REST API Layer (FastAPI)**: Serves JSON payload endpoints populated from local CSV databases.
*   **NOC Dashboard (React)**: Fetches routes from the REST API, updating live alerts, topology SVG dash flows, and predictive graphs without warning or interface updates.

---

## 13. Data Flow Lifecycle

The operational sequence of a simulated ESP32 Node follows a strict lifecycle:

```text
[ Power On / Reset ]
         │
         ▼
[ Initialize Drivers & GPIO Pinouts ]
         │
         ▼
[ Connect to Virtual AP (WiFi.begin) ]
         │
         ├─► Connection Timeout? ──► [ Retry Handshake ]
         ▼
[ Connect to Local Mosquitto Broker ]
         │
         ├─► Broker Down? ─────────► [ Reconnect Loop ]
         ▼
[ Read Peripherals (DHT11 / BMP280) ]
         │
         ▼
[ Run Virtual Metrics Models ]
         ├─► Calculate State-based Battery decay
         ├─► Compute RSSI Attenuation & Latency delay
         └─► Evaluate Random Packet Loss Check
         │
         ├───► Loss Check Fails? ──► [ Drop Transmission (Skip Publish) ]
         ▼
[ Serialize Metrics to JSON string ]
         │
         ▼
[ Publish Telemetry Payload to Topic ]
         │
         ▼
[ Mosquitto Broker receives payload ]
         │
         ▼
[ Ingestion Daemon (backend.py) parses JSON ]
         │
         ├───► Runs Stateful Fault Checks ──► [ Append alerts.log ]
         ├───► Appends records to database ─► [ Write CSV Files ]
         └───► Updates check-in registers ──► [ Feed Watchdog timer ]
         │
         ▼
[ FastAPI reads DB & feeds client requests ]
         │
         ▼
[ React Dashboard updates layout visuals ]
```

---

## 14. Engineering Considerations

### 14.1 Memory Management & JSON Fragility
In microcontrollers, dynamic memory allocation can lead to heap fragmentation and system crashes. The ESP32 firmware avoids Arduino's native `String` additions, utilizing the `StaticJsonDocument` buffer from the `ArduinoJson` library to compile payloads safely inside stack-allocated memory.

### 14.2 Time Syncing (NTP)
To ensure the backend chronologically aligns records, the MCU synchronizes its local clock with Network Time Protocol (NTP) servers over UDP (port `123`) upon boot, generating matching Unix Epoch floats inside the JSON payloads.

### 14.3 Robust Reconnection Loops
In rural or industrial environments, wireless links drop frequently. The firmware implements non-blocking reconnect timers. If the WiFi link drops, the node continues executing its local sensor reads and continues attempting reconnect loops in the background without locking the processor's primary control registers.

---

## 15. Migration to Phase 3

Transitioning from the PICSimLab simulation layer to physical physical hardware requires minimal effort:

1.  **Hardware Procurement**: Obtain standard ESP32 development boards, DHT11 sensors, BMP280 pressure shields, and battery casings.
2.  **Physical Wiring**: Wire the sensors to the MCU matching the GPIO layouts verified inside PICSimLab:
    *   DHT11 Signal ➔ GPIO Pin 4.
    *   BMP280 I2C lines ➔ GPIO Pin 21 (SDA) and Pin 22 (SCL).
3.  **Network configuration**: Edit `common/config.h` to supply the SSID and credentials of the physical local router and the IP address of the production server hosting the Mosquitto broker.
4.  **Flashing**: Connect the physical ESP32 to the workstation via a micro-USB link and execute:
    ```bash
    platformio run --target upload
    ```
5.  **Operation verification**: The physical nodes will publish telemetries immediately. The subscriber backend, FastAPI routes, and React NOC dashboard will visualize the live data without a single code adjustment.

---

## 16. Conclusion

Phase 2 introduces virtual embedded hardware simulation using **PICSimLab** to validate production firmware within a controlled virtual sandbox. 

By designing around a strict publish-subscribe interface boundary, the platform decouples hardware implementation from database and visualization frameworks. This modularity minimizes embedded debug cycles, ensures schema consistency, and establishes a clear, risk-free path to physical device deployment in Phase 3.
