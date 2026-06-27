# Phase 2 System Architecture: Wokwi Hardware Simulation Layer

This document defines the architectural specifications, component boundaries, and data flow models for **Phase 2 (Wokwi Hardware Simulation)** of the **Intelligent Wireless Sensor Network (WSN) Platform & Simulation** project.

---

## 1. Introduction

### 1.1 Purpose of Phase 2
Phase 2 introduces a virtual embedded hardware layer to transition the telemetry generation source from Python scripts (Phase 1) to standard microcontroller firmware (C/C++) executed within the **Wokwi** browser-based emulation sandbox. This step validates network interactions, hardware constraints, and memory allocation parameters of the embedded software prior to bare-metal physical flashing.

### 1.2 Pivot Rationale: Why Wokwi?
The Phase 2 architecture was pivoted from PICSimLab to Wokwi to overcome critical testing limitations:
1. **WiFi Availability**: PICSimLab QEMU lacks virtual Access Point scanning capabilities, failing standard `WiFi.begin()` scans. Wokwi emulates a standard WPA2 WiFi driver connecting to the virtual `Wokwi-GUEST` network.
2. **Zero Driver Conflicts**: Null-modem virtual COM port drivers (like `com0com` under Windows) cause exclusive resource locking conflicts when multiple terminal or Python scripts try to read them. Wokwi runs in the browser and connects directly to the broker via Web sockets/TCP, bypassing serial connections entirely.
3. **True Network Topology**: The nodes act as real standalone TCP clients over the network instead of serial-to-MQTT bridge proxies.

---

## 2. High-Level Architecture

The Phase 2 architecture decouples the physical hardware interface from downstream application logic by routing all telemetry packages through a public MQTT broker.

```text
                     +-----------------------------------+
                     |         Wokwi ESP32 Node          |
                     |  (Simulated ESP32 MCU Firmware)   |
                     +-----------------+-----------------+
                                       │
                                       ▼ Virtual WiFi (Wokwi-GUEST)
                     +-----------------+-----------------+
                     |          MQTT Publisher           |
                     |     (C++ PubSubClient Socket)     |
                     +-----------------+-----------------+
                                       │
                                       ▼ TCP Port 1883 (wsn_ahana_2026/+/+)
                     +-----------------+-----------------+
                     |       Public MQTT Broker          |
                     |       (broker.hivemq.com)         |
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
* **Wokwi ESP32 Node**: Runs compiled C/C++ microchip instructions and reads virtual DHT22 and BMP280 sensors.
* **MQTT Publisher**: Manages WiFi network association and MQTT client connections, packaging telemetry dictionaries into stack-allocated JSON payloads.
* **Public MQTT Broker**: broker.hivemq.com handles message routing, separating client publishers from local backend subscribers.
* **Python Backend**: Consumes topics asynchronously, writes local CSV log histories, computes gaps in sequence packages, and evaluates timeouts.
* **FastAPI Server**: Exposes endpoints serving telemetry data, predictions, and alerts.
* **React Dashboard**: Visualizes node status, metrics, and machine learning anomalies.

---

## 3. Data Flow Model

The data flow sequence illustrates the lifecycle of a single telemetry cycle:

```text
 [ DHT22/BMP280 ]   [ Wokwi ESP32 ]   [ Public Broker ]   [ Python Backend ]   [ React UI ]
        │                  │                  │                   │                 │
        ├─(Read Sensor)───►│                  │                   │                 │
        │                  ├─(Serialize JSON) │                   │                 │
        │                  ├─(Simulate Loss)  │                   │                 │
        │                  │                  │                   │                 │
        │                  ├─(Publish MQTT)──►│                   │                 │
        │                  │                  ├─(Route Payload)──►│                 │
        │                  │                  │                   ├─(Write CSV)     │
        │                  │                  │                   ├─(Run ML Forest) │
        │                  │                  │                   │                 │
        │                  │                  │                   │◄──(REST Fetch)──┤
        │                  │                  │                   │───(Send JSON)──►│
```

1. **Telemetry Read**: The virtual ESP32 queries the DHT22 and BMP280 simulated sensors via GPIO/I2C pin configurations.
2. **Network Constraints Simulation**: The firmware evaluates loss rate and latency functions to inject real-world RF anomalies.
3. **Payload Serialization**: The metrics are formatted into a minified JSON payload using the `ArduinoJson` library.
4. **MQTT Broadcast**: The payload is sent over TCP to `broker.hivemq.com` on topic `wsn_ahana_2026/{city}/data`.
5. **Database Merge**: The `backend.py` subscriber ingests the package, updates the packet loss tracker, and logs the records.
6. **Dashboard Render**: The frontend polls the FastAPI REST server, updating layout metrics and warning alerts in real time.

---

## 4. Hardware and Network Isolation
By design, the upstream FastAPI server and React NOC Dashboard are **100% decoupled** from the hardware implementation:
* The CSV files are written in standard formats regardless of whether they are generated by software virtual nodes or simulated C++ microcontrollers.
* This modularity ensures zero downtime or refactoring on the frontend/API layer when changing hardware profiles.
