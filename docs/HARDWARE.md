# Phase 3 Hardware Guide & Physical Assembly Instructions

This document provides a comprehensive guide for transitioning from the **Phase 2 (Wokwi Virtual Simulation)** environment to **Phase 3 (Physical Hardware Deployment)**. It details the required physical components, pinouts, wiring diagrams, power configurations, and PlatformIO upload instructions.

---

## 🔌 1. Physical Components List

To build a physical WSN node, assemble the following components:

| Item | Component | Specification / Notes | Qty |
| :--- | :--- | :--- | :--- |
| 1 | **ESP32 DevKitC v4** | target: `esp32dev` target core microcontroller | 1 |
| 2 | **DHT22 Sensor** | Temperature and relative humidity sensor (AM2302) | 1 |
| 3 | **BMP180 Sensor** | Barometric pressure & temperature sensor (I2C interface) | 1 |
| 4 | **Solderless Breadboard** | Standard 400-point or 830-point board for prototyping | 1 |
| 5 | **Jumper Wires** | Premium Male-to-Male (M-M) and Male-to-Female (M-F) | 10+ |
| 6 | **USB-to-MicroUSB Cable** | High-quality data cable for power & PlatformIO flashing | 1 |
| 7 | **Resistor (4.7kΩ)** | Pull-up resistor for DHT22 Data line (if not using a module) | 1 |

---

## 🎛️ 2. Wiring & Pinout Mapping

Wire the DHT22 and BMP180 sensors to the ESP32 DevKitC v4 according to the following layout:

```text
       +---------------------------------------+
       |           ESP32 DevKitC V4            |
       |                                       |
       |  [GND]   [5V]   [IO4]   [IO21]  [IO22] |
       +----+------+-------+-------+-------+---+
            |      |       |       |       |
            |      |       |       |       |
      +-----+------+       |       |       |
      |     |              |       |       |
    +-v-----+--+           |       |       |
    | VCC  GND |           |       |       |
    |  DHT22   <-----------+       |       |
    |  (DATA)  |                   |       |
    +----------+                   |       |
                                   |       |
    +----------+                   |       |
    |  BMP180  |                   |       |
    | (I2C)    |                   |       |
    |  VCC     <---+               |       |
    |  GND     <---|---------------+       |
    |  SDA     <---|-----------------------+
    |  SCL     <---|-------------------------------+
    +----------+
```

### Pin Connection Table

| Sensor | Sensor Pin | ESP32 Pin | Connection Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| **DHT22** | VCC | 3V3 / 5V | Power | Power line (3.3V or 5V depending on module) |
| | GND | GND | Ground | Ground connection |
| | DATA | GPIO 4 | Digital Input | Pull-up resistor (4.7kΩ) required to VCC |
| **BMP180** | VCC | 3V3 | Power | Power line (3.3V recommended) |
| | GND | GND | Ground | Ground connection |
| | SDA | GPIO 21 | I2C Data | SDA line |
| | SCL | GPIO 22 | I2C Clock | SCL line |

> [!NOTE]
> Most DHT22 and BMP180 sensor breakout boards have built-in pull-up resistors on their data/I2C lines. If using raw sensor components, you must place manual 4.7kΩ pull-up resistors on the digital lines.

---

## ⚡ 3. Power Configurations

Depending on your installation environment, configure the WSN nodes using one of the following methods:

### Option A: USB Power (Development & Indoor Deployment)
*   Connect the ESP32 MicroUSB port directly to a standard 5V USB Wall Charger or USB hub.
*   This provides stable power and allows real-time debugging via the Serial Monitor.

### Option B: LiPo Battery Power (Remote / Outdoor Deployment)
*   ESP32 boards do not contain onboard battery charging circuits by default. To run from a 3.7V LiPo battery, use a **TP4056 charger board** combined with a boost converter to supply 5V to the `5V` (or `VIN`) pin, or connect directly through a battery shield.
*   **Deep Sleep Optimization**: The Day 7 firmware defaults to continuous execution for simulation. For long-term battery setups, replace the sleep delay loops with ESP32 Deep Sleep:
    ```cpp
    esp_sleep_enable_timer_wakeup(60 * 1000000); // Sleep for 60 seconds
    esp_deep_sleep_start();
    ```

---

## 🛠️ 4. Local Deployment & Flashing Instructions

To compile and upload the firmware to your physical board using PlatformIO:

1.  **Open PlatformIO Workspace**:
    - Open VS Code and open the directory: `firmware/esp32_wsn_node`.
2.  **Verify Library Dependencies**:
    - Confirm that [platformio.ini](file:///d:/Projects/College/Wireless-Sensor-Network/firmware/esp32_wsn_node/platformio.ini) includes all libraries:
      ```ini
      lib_deps =
          knolleary/PubSubClient@^2.8
          bblanchon/ArduinoJson@^6.21.3
          adafruit/DHT sensor library@^1.4.6
          adafruit/Adafruit Unified Sensor@^1.1.14
          adafruit/Adafruit BMP085 Library@^1.0.1
      ```
3.  **Select Node Identity**:
    - Open [main.cpp](file:///d:/Projects/College/Wireless-Sensor-Network/firmware/esp32_wsn_node/src/main.cpp).
    - Edit line 10 to represent the target node city:
      ```cpp
      const char* city = "Bangalore"; // Delhi, Mumbai, Hyderabad, Secunderabad
      ```
    - Configure your local physical WiFi credentials at lines 13 and 14:
      ```cpp
      const char* ssid = "YOUR_WIFI_SSID";
      const char* password = "YOUR_WIFI_PASSWORD";
      ```
4.  **Flashing**:
    - Connect the physical ESP32 to your computer via USB.
    - Click the **PlatformIO Upload** button (the arrow icon in the VS Code status bar) or run:
      ```bash
      pio run --target upload
      ```
5.  **Debug Monitor**:
    - Click the **Serial Monitor** icon (plug icon in status bar) or run:
      ```bash
      pio device monitor
      ```
    - Set the speed to `115200` to inspect boot messages, NTP time sync, and MQTT telemetry logs.
