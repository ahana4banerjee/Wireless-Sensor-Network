# Phase 2 System Design: Wokwi Web-based Hardware Simulation Layer

This document details the transition from software-based virtual sensor nodes (Phase 1) to virtual embedded hardware nodes executing inside the **Wokwi** browser-based ESP32 simulator (Phase 2).

---

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to define the hardware simulation architecture using **Wokwi** and establish how simulated ESP32 chips running production-ready Arduino C++ firmware communicate telemetry data to the local WSN backend.

### 1.2 Architectural Pivot: From PICSimLab to Wokwi
Phase 2 was originally designed using the PICSimLab emulator. However, to bypass local host constraints and build a more robust simulation, the design was pivoted to Wokwi.

| Feature / Limit | Old Design (PICSimLab) | New Design (Wokwi) |
| :--- | :--- | :--- |
| **WiFi Emulation** | Lacks native WPA2 stack; QEMU model fails scans with `NO_AP_FOUND`. | Fully emulated WiFi connecting automatically to virtual `Wokwi-GUEST` gateway. |
| **Serial Communication** | Requires null-modem drivers (`com0com`) with frequent exclusive-access COM locks. | No local COM port dependencies; prints output straight to web console. |
| **MQTT Routing** | Requires custom python gateway scripts to bridge serial data to MQTT. | Publishes MQTT messages directly over TCP using `PubSubClient` and virtual WiFi. |
| **System Footprint** | Heavy installation, driver setups, and local network configurations. | 100% cloud-based simulation requiring zero local driver installations. |

---

## 2. Design Objectives

* **Hardware Abstraction**: Standardize node interactions over MQTT. The ingestion engine and REST gateways remain completely agnostic of the telemetry source, whether it is a Python process, a Wokwi browser block, or a physical ESP32.
* **Firmware Portability**: Develop standard Arduino C++ code utilizing `WiFi.h`, `PubSubClient.h`, and `ArduinoJson.h` which can be flashed directly onto real silicon in Phase 3.
* **Embedded Metrics Modeling**: Port the mathematical equations for battery depletion, RSSI noise, network latency, and packet loss from Phase 1 directly into C++ functions running inside the virtual ESP32.
* **Dynamic Configurations**: Support dynamic updates to the broker connection parameters via `configs/settings.json`.

---

## 3. System Architecture

The data pipeline routes telemetry from the cloud-based Wokwi ESP32 simulator down to the local dashboard:

```text
+-------------------------------------------------------------+
|                     WOKWI SIMULATOR (Browser)               |
|                                                             |
|   +-----------------------+     +-----------------------+   |
|   |   Virtual DHT22 Pin 4 |     | Virtual BMP280 I2C    |   |
|   +-----------┬-----------+     +-----------┬-----------+   |
|               │                             │               |
|               └───────────────┬─────────────┘               |
|                               ▼                             |
|                    +---------------------+                  |
|                    |  Wokwi ESP32 DevKit |                  |
|                    +----------┬----------+                  |
|                               │                             |
|                               ▼ WiFi.begin()                |
|                    [ Virtual Wokwi-GUEST AP ]               |
+-------------------------------│-----------------------------+
                                │
                                ▼ TCP Port 1883
                   +----------------────────+
                   |  Public MQTT Broker    | (broker.hivemq.com)
                   +------------┬-----------+
                                │
                                ▼ Topic: wsn_ahana_2026/+/+
                   +----------------────────+
                   |   Python Subscriber    | (backend.py daemon)
                   +------------┬-----------+
                                │ Writes to
                                ▼
                   +----------------────────+
                   |  CSV / SQLite Storage  |
                   +------------┬-----------+
                                │ Read / REST
                                ▼
                   +----------------────────+
                   |   React NOC Dashboard  |
                   +----------------────────+
```

---

## 4. Wokwi Simulation Environment

### 4.1 Networking
The ESP32 simulator connects to a special virtual access point:
* **SSID**: `Wokwi-GUEST`
* **Password**: `""` (Empty string)

This gateway routes TCP packets from the virtual board to the public internet, allowing the ESP32 to establish TCP connections with the public MQTT broker.

### 4.2 MQTT Configuration
To prevent client collisions and data pollution on the public broker, the system utilizes a unique base namespace:
* **Broker URL**: `broker.hivemq.com`
* **Port**: `1883` (non-SSL)
* **Base Topic**: `wsn_ahana_2026`
* **Topics**:
  * Heartbeat Status: `wsn_ahana_2026/{city}/status`
  * Weather Telemetry: `wsn_ahana_2026/{city}/data`

---

## 5. C++ Metrics Modeling

The simulated ESP32 runs equivalent equations to match Phase 1 behaviors:

### 5.1 Battery Consumption
```cpp
void update_battery(const char* eventType) {
    if (strcmp(eventType, "idle") == 0) {
        battery_level = max(0.0f, battery_level - 0.01f);
    } else if (strcmp(eventType, "heartbeat") == 0) {
        battery_level = max(0.0f, battery_level - 0.10f);
    } else if (strcmp(eventType, "data") == 0) {
        battery_level = max(0.0f, battery_level - 0.50f);
    }
}
```

### 5.2 RSSI Attenuation & Noise
```cpp
float get_signal_strength() {
    float noise = random(-300, 300) / 100.0;
    return rssi_baseline + noise;
}
```

### 5.3 Network Jitter and Loss
```cpp
bool simulate_network_behavior(float* latency) {
    float randCheck = random(0, 100) / 100.0;
    if (randCheck < packet_loss_rate) return false; // Simulated packet drop
    
    *latency = random(10, max_delay_ms);
    delay(*latency);
    return true;
}
```

---

## 6. Sensor Emulation (DHT22 & BMP280)

In Step 3 of Phase 2, virtual physical sensors are connected to the ESP32 inside Wokwi:
1. **DHT22 Sensor**: Connected to GPIO Pin 4. Emulates temperature and humidity.
2. **BMP280 Sensor**: Connected via the I2C interface (SDA ➔ Pin 21, SCL ➔ Pin 22) at address `0x76`. Emulates atmospheric pressure.

The firmware loads the official library headers and reads from the pins:
```cpp
#include <DHT.h>
#include <Adafruit_BMP280.h>

#define DHTPIN 4
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);
Adafruit_BMP280 bmp;

void read_sensors(float &temp, float &humidity, float &pressure) {
    temp = dht.readTemperature();
    humidity = dht.readHumidity();
    pressure = bmp.readPressure() / 100.0F; // Pa to hPa
}
```

---

## 7. Migration to Physical Hardware (Phase 3)

The transition from Wokwi simulation to physical hardware is straightforward:
1. **SSID Configuration**: Open `wokwi_node.ino` and replace `Wokwi-GUEST` with your local home or university WiFi SSID and password.
2. **MQTT Redirection**: If you prefer to route telemetry to a local MQTT broker on your host machine, change `mqtt_broker` to the local IP of your server (e.g. `192.168.1.X`) and update `configs/settings.json` accordingly.
3. **Flashing**: Connect the physical ESP32 to your workstation via USB and upload the sketch using PlatformIO:
   ```bash
   platformio run --target upload
   ```
