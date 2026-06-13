# System Architecture & Component Design

The Intelligent Wireless Sensor Network (WSN) System follows a modular, decoupled, and layered architecture. Each phase of the roadmap preserves the communication protocols, API interfaces, and visualization views, changing only the sensor nodes' physical implementation.

---

# Data Flow Architecture (Phase 1)

```text
+----------------------+
|  Virtual Sensor Node |  ==> (Generates OpenWeather telemetry, battery decay)
|  (Python Process)    |
+----------------------+
            │
            │  MQTT (wsn/{city}/status, wsn/{city}/data)
            ▼
+----------------------+
|    MQTT Broker       |  ==> (Mosquitto local port 1883)
|     (Mosquitto)      |
+----------------------+
            │
            │  paho-mqtt
            ▼
+----------------------+
|    Python Backend    |  ==> (Ingests packets, appends CSV logs, runs
|   (Message Loop)     |       stateful fault checks, auto-merges dataset)
+----------------------+
            │
            │  Reads CSV tables (wsn_dataset.csv, alerts.log)
            ▼
+----------------------+
|   FastAPI REST API   |  ==> (Pydantic validation, CORS enabled,
|  (Uvicorn Gateway)   |       serves endpoint routes on port 8000)
+----------------------+
            │
            │  HTTP / Fetch (10-second polling)
            ▼
+----------------------+
|    React Frontend    |  ==> (Vite dynamic SPA client, Recharts,
|    (Vite Client)     |       Interactive SVG WSN Topology, Event Stream)
+----------------------+
```

---

# Data Flow Architecture (Phase 2: PICSimLab Hardware Simulation)

```text
+----------------------+
|   PICSimLab Nodes    |  ==> (Virtual hardware board, simulated ESP32/ESP8266)
|  (Simulated Board)   |
+----------------------+
            │
            │  MQTT (wsn/{city}/status, wsn/{city}/data)
            ▼
+----------------------+
|    MQTT Broker       |
+----------------------+
            │
            │  paho-mqtt
            ▼
+----------------------+
|    Python Backend    |
+----------------------+
            │
            │  Reads CSV tables
            ▼
+----------------------+
|   FastAPI REST API   |
+----------------------+
            │
            │  HTTP / Fetch
            ▼
+----------------------+
|    React Frontend    |
+----------------------+
```

---

# Data Flow Architecture (Phase 3: Real ESP8266/Arduino Hardware)

```text
+----------------------+
|  Physical Sensor Node|  ==> (ESP8266 / Arduino board with DHT11 sensors)
|   (Real Hardware)    |
+----------------------+
            │
            │  MQTT (wsn/{city}/status, wsn/{city}/data)
            ▼
+----------------------+
|    MQTT Broker       |
+----------------------+
            │
            │  paho-mqtt
            ▼
+----------------------+
|    Python Backend    |
+----------------------+
            │
            │  Reads CSV tables
            ▼
+----------------------+
|   FastAPI REST API   |
+----------------------+
            │
            │  HTTP / Fetch
            ▼
+----------------------+
|    React Frontend    |
+----------------------+
```

---

# Node Transition Lifecycle (Phases 1-3)

```text
Phase 1: Python Virtual Nodes ────┐
                                   │
Phase 2: PICSimLab Hardware ───────┼─► [MQTT Broker] ─► [Backend API] ─► [React Dashboard]
                                   │
Phase 3: Physical ESP8266 Node ────┘
```

The underlying network communication model, backend processors, API services, and frontend visualization structures remain completely **unchanged** throughout. Only the telemetry source evolves.

---

# Backend & REST API Specifications

The Python backend subscriber acts as the diagnostic and merging engine. The **FastAPI** layer exposes these stats through structured endpoints using **Pydantic** models.

### API Endpoint Index

#### 1. System Health Checklist
* **Route**: `GET /api/health`
* **Response**:
  ```json
  {
    "status": "online",
    "service": "wsn-api"
  }
  ```

#### 2. WSN Node Registries
* **Route**: `GET /api/nodes`
* **Description**: Returns all simulated node connection statuses and live battery/signal indexes.
* **Response Structure**:
  ```json
  {
    "total_nodes": 5,
    "nodes": [
      {
        "node_id": "Hyderabad",
        "status": "ONLINE",
        "battery_level": 98.4,
        "signal_strength": -65.0
      }
    ]
  }
  ```

#### 3. Real-time Flat Telemetry
* **Route**: `GET /api/live-data`
* **Description**: Delivers the latest single observation package logged for each active regional node.

#### 4. Machine Learning Anomalies
* **Route**: `GET /api/anomalies`
* **Description**: Computes overall contamination rates and lists recent outlier events identified by the Isolation Forest model.
* **Response Structure**:
  ```json
  {
    "total_anomalies": 119,
    "anomaly_percentage": 5.01,
    "recent_anomalies": [
      {
        "timestamp": "Tue Jun  9 00:05:10 2026",
        "unix_ts": 1778573179.249,
        "node_id": "Delhi",
        "temp": 40.33,
        "anomaly_flag": 1
      }
    ]
  }
  ```

#### 5. Network Summary Statistics
* **Route**: `GET /api/analytics/summary`
* **Description**: Exposes overall dataset metrics, including global means of latency, packet drop rates, and temperature.

#### 6. Environmental Predictions
* **Routes**: `GET /api/predictions/temperature` & `GET /api/predictions/humidity`
* **Description**: Serves forecast points compared directly against regression models persisted in `models/`.

#### 7. Stateful System Alarms
* **Route**: `GET /api/alerts`
* **Description**: Fetches current active incidents alongside the historical database audit feed parsed from `data/logs/alerts.log`.

#### 8. Deterministic Network Health Details
* **Route**: `GET /api/network-health`
* **Description**: Computes and returns the Network Health Index (NHI) metrics (battery, signal, latency, packet loss subscores and statuses) for each node based on latest check-ins.

#### 9. Network Parameter Predictions
* **Route**: `GET /api/network-predictions`
* **Description**: Returns actual vs predicted test observations for battery levels, packet losses, and response latencies generated by Gradient Boosting.

#### 10. Central System Health Score
* **Route**: `GET /api/system-score`
* **Description**: Aggregates node health scores to calculate average health coefficients and classification states.

#### 11. Simulation Parameters Configuration
* **Routes**: `GET /api/settings` & `POST /api/settings`
* **Description**: Serves or saves the simulated metrics constraints profile, writing outputs to `configs/settings.json`.

#### 12. Query Logs Export Engine
* **Route**: `GET /api/export`
* **Description**: Performs database queries on historical logs, returning download channels for custom range checks.

---

# Frontend Architecture & Interactive Features

The user interface is built as a single-page application (SPA) optimized for high-density network operations control.

### Core Features

1. **Executive Status Grid (Header)**:
   * Displays gateway status (ping indicators), active operational nodes, total database size, running packet drop averages, and network latency metrics.

2. **Interactive SVG Topology Panel**:
   * Visualizes the network structure mapping drop lines from the broker down to nodes (`HYD`, `DEL`, `MUM`, `BLR`, `SEC`).
   * Color-codes nodes dynamically: **Green** (Healthy), **Yellow** (Warning: battery drop, packet drop, signal attenuation, or latency spike), and **Red** (Fault/Offline).
   * Connection links show flowing dash animations (`flow-line-active` keyframes) for healthy feeds, and static solid red lines for broken links.
   * Node hovers reveal overlays reporting precise battery levels, RSSI strength, latency in ms, and packet loss.

3. **Live Operational Event Stream (Sidebar)**:
   * Appends checking events (heartbeats, battery warnings, prediction syncs, latency spikes) dynamically in real-time.
   * Auto-scrolls to target the latest incoming feeds.
   * Color-codes icons and borders by risk severity.

4. **Performance & Bundle Optimizations**:
   * **Lazy Loading**: Code-splits secondary route pages asynchronously via `React.lazy()` to shrink initial load times.
   * **Page Skeletons**: Displays pulsing loading blocks and spinners inside chart views while pages fetch data to ensure seamless transitions.
   * **Cascading Render Resolvers**: Moves synchronous `setState` out of `useEffect` callbacks to click handlers (with `useCallback` references) to prevent layout rendering blocks.
