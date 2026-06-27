# Node Registry & Generic Firmware Architecture

This document specifies the architecture and implementation details of the **Generic Node Registry Redesign**, which decouples embedded firmware execution from regional/geographical location metadata.

---

## 🏗️ 1. Redesign Objective

Historically, the ESP32 microcontroller firmware was compiled with hardcoded city strings (e.g. `const char* city = "Bangalore"`). This coupled hardware nodes to physical locations, requiring manual code changes and compilation runs whenever a node was reassigned or a new node was introduced.

The redesign decouples the firmware from location names by introducing a centralized **Node Registry** on the backend. The firmware remains completely generic and only knows its unique `node_id`.

---

## 📡 2. Decoupled Data Flow Model

```text
  +------------------------------------------------+
  |               ESP32 Generic Node               |
  |  Firmware only knows:                          |
  |  - node_id = "node_01"                         |
  |  - MQTT Broker                                 |
  +-----------------------+------------------------+
                          |
                          | (Publish status/data)
                          v
        MQTT Topic: wsn_ahana_2026/node_01/data
                          |
                          v
  +-----------------------+------------------------+
  |              Backend subscriber                |
  |  1. Parses MQTT topic -> "node_01"             |
  |  2. Queries Node Registry -> "Bangalore"       |
  |  3. Fetches live weather for "Bangalore"       |
  |  4. Appends to wsn_dataset.csv as "Bangalore"  |
  +-----------------------+------------------------+
                          |
                          v (Zero changes downstream)
  +-----------------------+------------------------+
  |            React NOC Dashboard                 |
  |  Displays live analytics under city labels     |
  +------------------------------------------------+
```

---

## 🎛️ 3. Component Breakdown

### 3.1 Node Registry Schema (`configs/nodes_registry.json`)
The registry maps unique hardware node IDs to geographical positions, sensor capabilities, and operational metadata.

```json
{
    "node_01": {
        "node_id": "node_01",
        "location": "Bangalore",
        "coordinates": {"lat": 12.9716, "lon": 77.5946},
        "sensor_type": "DHT22+BMP180",
        "status": "ONLINE",
        "firmware_version": "2.0.0",
        "last_seen": 1782627000
    }
}
```

### 3.2 Generic C++/Arduino Firmware (`wokwi_node.ino`)
*   **Variable Name**: Replaced `const char* city` with `const char* node_id`.
*   **Topics**: Formulates topics using `node_id` (e.g., `wsn_ahana_2026/node_01/data`).
*   **MQTT Client ID**: Combines `node_id` and random hexes for connection uniqueness.

### 3.3 Dynamic Ingestion Mapping (`backend.py`)
*   When a packet arrives, the backend extracts the middle segment from the MQTT topic filter (`wsn_ahana_2026/<node_id>/data`).
*   It performs a registry lookup to resolve `node_id` to its corresponding target `location` string.
*   **Backward Compatibility**: If a legacy client publishes on a city-named topic (e.g., `wsn_ahana_2026/Bangalore/data`), the resolver returns the topic segment itself (`"Bangalore"`), preventing any service disruption.

---

## 🚀 4. Scaling: Adding New Nodes

To deploy a new sensor node to the grid:
1.  **Register the Node**: Add an entry into [nodes_registry.json](file:///d:/Projects/College/Wireless-Sensor-Network/configs/nodes_registry.json) with a new node ID (e.g., `node_06`) and target location.
2.  **Flash the Firmware**: Flash the generic firmware binary onto the ESP32 chip, setting `node_id = "node_06"`.
3.  No changes to backend processing or frontend dashboards are required!
