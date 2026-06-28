# Technical Reference Manual & Developer Context

This document is the onboarding manual for the **Wireless Sensor Network (WSN) Platform**. It details the engineering philosophies, firmware specifications, backend frameworks, data structures, and machine learning decisions that define the platform.

---

## 1. Engineering Philosophy & Sandboxed Design

### 1.1 The Simulation-First Principle
Building physical IoT and sensor installations usually suffers from hardware dependency bottlenecks:
1.  **Iterative Debugging is Slow**: Flashing bare-metal microcontrollers (ESP32/ESP8266) over USB to debug memory leaks or network drops is time-consuming.
2.  **Unpredictable Environments**: Simulating RF attenuation, packet dropouts, and power drain in a clean laboratory is difficult.
3.  **Procurement Barriers**: Acquiring sensors and microcontrollers before verifying backend databases, analytics engines, and dashboards slows development.

To bypass these hurdles, this platform was built using a **simulation-first architecture**:
*   All interfaces, protocols, schemas, and analytics pipelines were designed and validated in software sandboxes (Phase 1).
*   The software nodes were replaced by simulated embedded microchips running generic C++ firmware (Phase 2).
*   The transition to physical microchips (Phase 3) is a drop-in swap requiring zero changes to databases, APIs, retraining daemons, or frontend dashboards.

### 1.2 Core Architectural Decisions
*   **Decoupled Modularity**: Telemetry sources are completely agnostic to the storage and presentation layers. They connect over standard MQTT protocols.
*   **Decoupled Identity (Generic Firmware)**: ESP32 firmware is compiled globally with no location-specific attributes. It resolves its identity at runtime using its default hardware eFuse MAC address.
*   **Digital Twin Inter-Process Bridge**: Because the ingestion daemon (`backend.py`) and the REST API server (`uvicorn`) run as separate OS processes, the **Digital Twin** state layer acts as a thread-safe JSON file-bridge.
*   **Explainable Operations Intelligence**: The system prioritizes deterministic, trace-based operational insights over black-box predictions, ensuring operator directives are explainable.

---

## 2. Firmware Specifications & State Ingestion

### 2.1 eFuse MAC-Based Identification
Every microcontroller flashed with the generic firmware retrieves its native MAC address on startup:
```cpp
uint8_t mac[6];
esp_efuse_read_mac_address_default(mac);
char macStr[18];
snprintf(macStr, sizeof(macStr), "%02x:%02x:%02x:%02x:%02x:%02x", 
         mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
```
This MAC string is sent as `node_id` in status heartbeats and data packets. On packet ingestion, `backend.py` parses the MAC and queries the central fleet index [nodes_registry.json](file:///d:/Projects/College/Wireless-Sensor-Network/configs/nodes_registry.json) to resolve the city name, lat/lon coordinates, and default settings.

### 2.2 Telemetry Ingestion Logic
The ingestion process in `backend.py` handles:
1.  **Uptime & Sequence Verification**: Tracks message sequence indexes (`seq`). If it detects gaps (e.g., sequence jumps from 10 to 12), it registers packet loss.
2.  **Transit Latency Estimation**: Compares the arrival system time with the packet's `unix_ts` timestamp:
    $$\text{Latency (ms)} = (\text{Arrival Time} - \text{unix\_ts}) \times 1000$$
3.  **Heartbeat Watchdog Monitoring**: Monitors periodic node check-ins. If a node fails to check in for 45 seconds, it flags it as `OFFLINE`.

---

## 3. Digital Twin Management

The Digital Twin maintains the software state of every node in [twins_state.json](file:///d:/Projects/College/Wireless-Sensor-Network/data/twins/twins_state.json).

*   **Atomic Updates**: Because backend ingestion threads and API worker threads access this state file simultaneously, updates are performed using atomic system writes to prevent data corruption:
    ```python
    temp_path = STATE_PATH + ".tmp"
    with open(temp_path, "w") as f:
        json.dump(self.twins, f)
    os.replace(temp_path, STATE_PATH)
    ```
*   **State Schema**: Includes firmware version, battery, RSSI, latency, packet loss, calculated health score, and online status.

---

## 4. Machine Learning & Retraining Pipelines

### 4.1 Estimator Index
The platform deploys four ML tasks serialized as `.pkl` models under `models/`:
1.  **Isolation Forest (`anomaly_model.pkl`)**: Unsupervised detector monitoring multidimensional outliers in weather variables (`temp`, `humidity`, `pressure`, `wind_speed`).
2.  **Temperature Forecaster (`temp_model.pkl`)**: Linear Regression predicting ambient temperature patterns.
3.  **Humidity Forecaster (`humidity_model.pkl`)**: Linear Regression predicting ambient relative humidity.
4.  **Network Projections**: Linear Regression estimators (`battery_model.pkl`, `latency_model.pkl`, `packet_loss_model.pkl`) predicting network behavior based on signal strength, battery depletion, and transmission delay.

### 4.2 Automated Retraining Retraining Policy
Managed by `src/ml/training_manager.py`, retraining runs in the background. It is triggered only when:
1.  **Data Accumulation**: At least `500` new records are appended to `wsn_dataset.csv`.
2.  **Cooldown Period**: At least `24` hours have elapsed since the last training run to prevent resource contention.

### 4.3 Validation-Gated Deployment
Retraining runs evaluate a candidate model against the active model on a 20% validation fold. The candidate is promoted only if it yields a strictly higher $R^2$ validation score:
$$R^2_{\text{candidate}} > R^2_{\text{champion}}$$
Promotion replaces the active model file, logging version histories in [registry.json](file:///d:/Projects/College/Wireless-Sensor-Network/models/registry.json).

---

## 5. Operations Intelligence Forecasting & Insights

To evolve from ML validation to operational decision support, the platform implements a forecasting service in `src/utils/forecast_engine.py`.

### 5.1 Rolling Forecasting Engine
*   **Time Horizons**: Generates 24h, 48h, and 72h predictions in 3-hour steps.
*   **Autoregressive Weather Loop**: Temperature and humidity are predicted recursively, using previous output states as inputs for subsequent steps.
*   **Network Extrapolation**:
    - *Battery Decay*: Decreased linearly based on the node's specific discharge rate (defaulting to 0.15% to 0.35% per hour).
    - *RSSI Signal Trend*: Projects signal strength forward linearly, calculating slope from the last 10 historical readings to detect gradual degradation.
    - *Latency and Packet Loss*: Projects future latency and packet loss from simulated battery levels and signal trends using `latency_model.pkl` and `packet_loss_model.pkl`.

### 5.2 Deterministic Actionable Insights
*   **Battery swaps**: Battery expected to drop below 20% within $X$ hours $\rightarrow$ schedule maintenance in 24h.
*   **RF interference checks**: RSSI slope is degrading steadily $\rightarrow$ inspect antenna realignment.
*   **Gateway checks**: Packet loss predicted to exceed 15% $\rightarrow$ check gateway connections.
*   **Atmospheric corrections**: Humidity forecast above 90% $\rightarrow$ rain likely, visibility low.

---

## 6. Portfolio Showcase Demo Mode

For deployments (e.g. static Render nodes) where running background MQTT clients or physical simulators is not feasible, the server supports **Demo Mode Replay**:
*   Intercepts live data queries.
*   Calculates a virtual clock index using system clock modulo:
    $$\text{tick} = \lfloor\frac{\text{unix\_time}}{\text{polling\_interval}}\rfloor \pmod{\text{dataset\_length}}$$
*   Serves matching historical rows from log files, overwriting timestamps with the current clock to keep nodes marked as `ONLINE`.
