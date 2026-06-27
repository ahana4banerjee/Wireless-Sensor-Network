# Phase 2 7-Day Implementation Plan: Wokwi WSN Simulation Grid

This document establishes the 7-day execution plan for **Phase 2 (Virtual Embedded Hardware Simulation)** of the **Intelligent Wireless Sensor Network (WSN) Platform & Simulation** project. It serves as the primary source of truth for tracking tasks, files, and verification steps.

---

## 📅 Roadmap Overview

```text
  Day 1 (Done) ──► Day 2 (Done) ──► Day 3 (Done) ──► Day 4 (Done) ──► Day 5        ──► Day 6        ──► Day 7
  Bootstrapping    WiFi & Broker    Sensors (DHT)    NTP Time Sync   5-Node Grid      Failure Model    Final Sign-off
```

| Day | Goal | Status | Focus Files |
| :--- | :--- | :--- | :--- |
| **Day 1** | Env Bootstrapping & Blink | **Completed** | `esp32_wsn_node/src/main.cpp` |
| **Day 2** | WiFi & Public MQTT Broker Handshake | **Completed** | `wokwi_node.ino`, `backend.py`, `settings.json` |
| **Day 3** | Sensor Integration (DHT22 & BMP280) | **Completed** | `wokwi_node.ino`, `diagram.json` |
| **Day 4** | Network Time Protocol (NTP) Sync | **Completed** | `wokwi_node.ino` |
| **Day 5** | Multi-Node Grid Orchestration | *Scheduled* | Wokwi Tab Orchestrations |
| **Day 6** | System Robustness & Failure Modeling | *Scheduled* | `settings.json`, `backend.py` |
| **Day 7** | PlatformIO Sync & Phase 3 Roadmap | *Scheduled* | `esp32_wsn_node/src/main.cpp`, `platformio.ini` |

---

## 🛠️ Daily Execution Details

### Day 1: Environment & Virtual Board Bootstrapping (Completed)
* **Goal**: Transition from Python virtual nodes to embedded C/C++ firmware concepts. Verify compilation inside VS Code.
* **Architecture**: Set up PlatformIO project with ESP32-DevKitC target.
* **Verification**: Successfully compile a basic Blink binary and load the environment configurations.

### Day 2: WiFi & Public Broker MQTT Handshake (Completed)
* **Goal**: Bridge the simulated ESP32 in Wokwi over WiFi to the Python subscriber backend on the host machine.
* **Why the Pivot**: Bypassed PICSimLab's virtual COM port sharing locks on Windows and QEMU's WiFi scanning limits by routing data over Wokwi's virtual WiFi to a public MQTT broker.
* **Implementation**:
  * Created `firmware/wokwi_node/wokwi_node.ino` publishing JSON telemetries.
  * Configured `configs/settings.json` and `src/backend.py` to route traffic dynamically through `broker.hivemq.com:1883` under the unique namespace `wsn_ahana_2026`.
* **Verification**: Verified that `backend.py` connects to the public broker, parses incoming test payloads, logs output, and successfully feeds FastAPI endpoints.

---

### Day 3: Physical Sensor Integration (DHT22 & BMP280)
* **Goal**: Transition from random weather mocks to reading from simulated physical sensors wired to the ESP32.
* **Architecture**: 
  * Connect a virtual **DHT22** Temperature/Humidity sensor to ESP32 Pin 4.
  * Connect a virtual **BMP280** Barometric Pressure sensor using the I2C bus (SDA Pin 21, SCL Pin 22) at address `0x76`.
* **Files to Modify**:
  * `firmware/wokwi_node/wokwi_node.ino`: Import libraries, initialize drivers, and replace the random telemetry functions with real sensor reads.
  * `firmware/wokwi_node/diagram.json`: Wire the sensor chips to the ESP32 board.
* **Wokwi Library Additions**:
  * `DHT sensor library` by Adafruit
  * `Adafruit BMP280 Library`
* **Verification**: Adjust Wokwi sliders for temperature, humidity, and barometric pressure during simulation and verify that the React dashboard updates its graphs in real-time.

---

### Day 4: Network Time Protocol (NTP) Synchronizations
* **Goal**: Obtain accurate Unix Epoch timestamps from the internet to synchronize simulated nodes with the backend system time.
* **Why**: ESP32 chips do not have a built-in real-time clock (RTC) backed by a battery. On startup, their timestamp is `0.0`. NTP resolves this by fetching UTC seconds via UDP.
* **Implementation**:
  * Update `wokwi_node.ino` to query `pool.ntp.org` on boot.
  * Replace the placeholder time metrics `millis() / 1000.0` with the actual Unix Epoch timestamp.
* **Verification**: Check Wokwi Serial monitor outputs to ensure `ts` is a valid 10-digit epoch timestamp (e.g. `178xxxxxxx.0`) and that records align sequentially in CSV databases.

---

### Day 5: Multi-Node Grid Orchestration
* **Goal**: Run the full WSN regional network grid concurrently using multiple independent simulated microcontrollers.
* **Architecture**:
  * Open 5 concurrent browser sessions/tabs running Wokwi ESP32 simulations.
  * Set the `city` parameter in each tab's firmware to represent all regional nodes: `Bangalore`, `Delhi`, `Hyderabad`, `Mumbai`, and `Secunderabad`.
* **Verification**: Verify that the Python backend ingestion logs show simultaneous data updates across all 5 nodes and that the React NOC Dashboard lights up all SVG node links.

---

### Day 6: System Robustness & Failure Modeling
* **Goal**: Test backend watchdog timers and Gradient Boosting anomaly detectors against controlled virtual hardware faults.
* **Implementation**:
  * **Battery Depletion**: Let a simulated node run until its battery hits `0.0%`. Verify that it turns `OFFLINE` on the dashboard, triggers a CRITICAL alert in `alerts.log`, and successfully recovers back to `ONLINE` after a maintenance reload.
  * **High Latency**: Modify the simulation parameters to inject artificial transmission delays. Verify that the backend detects high-latency anomalies and flags warnings.
  * **Packet Drops**: Trigger sequential packet loss to verify that the backend's loss-tracker calculates correct gaps in sequence numbers.
* **Verification**: Confirm that the FastAPI REST routes return appropriate anomaly classifications and that warning boxes pop up on the dashboard.

---

### Day 7: PlatformIO Sync & Phase 3 Roadmap Handover
* **Goal**: Sync the local PlatformIO repository with the final production-ready simulation code and deliver physical assembly instructions.
* **Implementation**:
  * Copy the verified `wokwi_node.ino` C++ code into the local [main.cpp](file:///d:/Projects/College/Wireless-Sensor-Network/firmware/esp32_wsn_node/src/main.cpp).
  * Configure [platformio.ini](file:///d:/Projects/College/Wireless-Sensor-Network/firmware/esp32_wsn_node/platformio.ini) to include the required sensor and client dependencies (`PubSubClient`, `ArduinoJson`, `DHT sensor library`, `Adafruit BMP280 Library`).
  * Verify that the local firmware compiles cleanly.
* **Deliverables**: Write a Phase 3 Hardware guide listing physical components (ESP32 DevKit, DHT22, BMP280), pinout diagrams, and power configurations.
