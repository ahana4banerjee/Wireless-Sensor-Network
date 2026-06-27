# Intelligent WSN Platform: Technical Reference & Context

This document serves as the **technical source of truth** and developer onboarding reference for the **Intelligent Wireless Sensor Network (WSN) Platform**. It details the core engineering decisions, system designs, machine learning integration pipelines, generic firmware abstractions, digital twin layers, and continuous learning systems.

---

## 1. Executive Project Summary

### 1.1 Motivation & Rationale
Deploying, configuring, and debugging physical Wireless Sensor Networks (WSNs) presents severe operational challenges, including physical hardware accessibility, power constraints (battery drainage), environmental RF noise, signal attenuation, and network transit issues. Debugging microcontrollers directly in physical installations is slow, expensive, and logistically difficult.

To solve this, the platform adopts a **simulation-first development approach**:
- All physical, electrical, and network characteristics are modeled in software or emulated via hardware sandboxes first.
- The downstream database, ingestion pipelines, REST APIs, ML predictors, and client dashboards are verified using simulated telemetry before flashing a single line of firmware to physical microchips.
- The interface and protocol contracts remain identical across all development phases; only the telemetry source evolves.

### 1.2 Development Roadmap Phases
1. **Phase 1: Pure Software Simulation (Completed)**: Simulated atmospheric and network conditions for 5 nodes concurrently using Python weather scripts mapping real-world OpenWeather API metrics to localized virtual models.
2. **Phase 2: Virtual Hardware Emulation (Completed)**: Replaced Python simulators with production-ready C++ firmware compiled inside browser-based **Wokwi** ESP32 emulators. Introduced dynamic hardware eFuse MAC address resolution, a central Node Registry, a non-blocking background Training Manager service with validation-gated auto-retraining, a Digital Twin state management layer, and an ML Operations dashboard.
3. **Phase 3: Physical Hardware Deployment (Future)**: Compilation of identical C++ firmware (via PlatformIO) loaded onto physical ESP32 modules configured with real DHT22 and BMP180 sensors publishing to the same broker endpoints.

---

## 2. Dynamic Folder Architecture

The active repository layout is structured as follows:

```text
Wireless-Sensor-Network/
├── configs/                     # Central system configurations
│   ├── settings.json            # Dynamic simulation settings (intervals, loss, delay, battery discharge)
│   └── nodes_registry.json      # Node Registry mapping MAC addresses to location metadata
├── dashboard/                   # React SPA Frontend (Vite)
│   ├── src/
│   │   ├── components/          # UI Components
│   │   │   ├── pages/           # Route views (Overview, Analytics, Predictions, MLOps, Alerts, Settings, Export)
│   │   │   └── ui/              # Modular skeleton components and state loaders
│   │   ├── services/
│   │   │   └── api.js           # REST API client services
│   │   ├── App.jsx              # Caching page router & lazy imports
│   │   └── index.css            # CSS styling system
│   ├── .env                     # Production env variables (pointing to Render API)
│   ├── .env.local               # Local env overrides (points to local uvicorn, gitignored)
│   └── vite.config.js           # Vite server parameters
├── data/                        # Persisted file storage
│   ├── logs/                    # Event logs
│   │   ├── backend.log          # Subscriber diagnostic logs
│   │   ├── training.log         # Retraining daemon process logs
│   │   └── alerts.log           # Persisted fault notifications
│   ├── processed/
│   │   └── wsn_dataset.csv      # Unified master ML training dataset
│   └── twins/
│       └── twins_state.json     # Inter-process shared state store for Digital Twins
├── docs/                        # Architecture & deployment documentations
│   ├── archive/                 # Retired plans, wireframes, and design drafts
│   ├── design/
│   │   └── DESIGN_SYSTEM.md     # NOC-style dashboard styling specifications
│   └── PHASE3_HARDWARE_GUIDE.md # Future physical hardware assembly guide
├── firmware/                    # Embedded C++ firmware
│   ├── esp32_wsn_node/          # PlatformIO workspace for physical targets
│   │   ├── src/main.cpp         # Generic firmware code
│   │   └── platformio.ini       # Pin mappings and library dependency registry
│   └── wokwi_node/              # Wokwi simulation source
│       ├── wokwi_node.ino       # Generic browser C++ sketch
│       └── diagram.json         # Simulated ESP32 and sensor pin schematics
├── models/                      # Saved Estimators & Serialization
│   ├── registry.json            # Version logs, MAE/RMSE/R² metrics for active/candidate models
│   └── *.pkl                    # Serialized model binary states
├── src/                         # Python API & Subscriber Core
│   ├── api/
│   │   ├── routes/              # Modular REST controllers (twins, models, analytics, etc.)
│   │   ├── demo.py              # Modulo-clock time-replay engine for stateless deployments
│   │   ├── schemas.py           # Pydantic JSON validation interfaces
│   │   └── main.py              # Uvicorn FastAPI startup router
│   ├── ml/
│   │   ├── anomaly_detection.py # Isolation Forest unsupervised outlier model
│   │   ├── environment_predictor.py # Ambient Temp/Humidity Linear Regressions
│   │   ├── network_health.py    # Deterministic NHI scoring functions
│   │   ├── network_predictor_v2.py # Gradient Boosting estimators for Battery/Loss/Latency
│   │   └── training_manager.py  # Background continuous learning daemon service
│   └── backend.py               # MQTT subscriber engine & heartbeat watchdog
└── requirements.txt             # Unified Python dependencies manifest
```

---

## 3. Generic Firmware & Identity Decoupling

### 3.1 Hardware MAC-Based Resolution
To scale WSN grids to hundreds of nodes, firmware must remain strictly generic. The compilation configuration does not hardcode location parameters.

1. **Auto-Identity Discovery**: Setting `node_id = "mac"` in the C++ firmware causes the ESP32 to query its native physical eFuse station MAC address on boot via:
   ```cpp
   uint8_t mac[6];
   esp_efuse_read_mac_address_default(mac);
   ```
2. **Generic Build**: A single compiled binary can be flashed onto all microcontrollers in the fleet.
3. **Location Resolution**: When the node publishes to the base MQTT topic, the packet contains the MAC address (e.g. `wsn_ahana_2026/240ac4083201/data`). The backend subscriber intercepts this ID and queries the **Node Registry** to map the MAC to geographical coordinates, weather source parameters, and dashboard markers.

### 3.2 Node Registry Schema (`configs/nodes_registry.json`)
The registry provides the single source of truth for physical node placements:
```json
{
  "240ac4083201": {
    "node_id": "240ac4083201",
    "location": "Bangalore",
    "coordinates": {"lat": 12.9716, "lon": 77.5946},
    "sensor_type": "DHT22+BMP180",
    "status": "ONLINE",
    "firmware_version": "2.1.0",
    "last_seen": 1782627400
  }
}
```

---

## 4. Digital Twin Management Layer

### 4.1 Concept & Architecture
Every simulated or physical node has a corresponding software twin maintained by the backend. Clients (such as the React frontend) read the structured digital twin state rather than processing raw MQTT packets.

Because `backend.py` (the MQTT subscriber daemon) and `uvicorn` (the REST API server) run as separate operating system processes, direct in-memory sharing is impossible. The twin layer implements a **persisted state store** via `data/twins/twins_state.json` to act as an inter-process bridge (mirroring a Redis deployment).

### 4.2 Update Flow & Thread Safety
- **MQTT Packets**: Ingested by `backend.py` ➔ Passed to `twin_manager.update_twin(node_id, location, data, msg_type)`.
- **Atomic Persistence**: To prevent partial reads or file corruption during rapid updates, the manager writes to disk using a temp-file atomic swap:
  ```python
  tmp_path = TWINS_STATE_PATH + ".tmp"
  with open(tmp_path, "w") as f:
      json.dump(self._twins, f)
  os.replace(tmp_path, TWINS_STATE_PATH)
  ```
- **Watchdog Timeout**: If a node fails to check in for 45 seconds, the watchdog thread in `backend.py` triggers `twin_manager.mark_offline(location)`, transitioning the twin's status to `OFFLINE`.

---

## 5. Machine Learning & Continuous Learning Pipelines

### 5.1 Estimator Index
The platform operates nine active ML models:
1. **Isolation Forest** (`anomaly_model.pkl`): Unsupervised outlier detector monitoring multi-dimensional variance in temperature, humidity, and barometric pressure.
2. **Temperature Predictor** (`temp_model.pkl`): Forecasts diurnal ambient temperature patterns.
3. **Humidity Predictor** (`humidity_model.pkl`): Forecasts diurnal relative humidity.
4. **Linear Baseline Regressors**: Separate models tracking `battery`, `latency`, and `packet_loss`.
5. **Gradient Boosting Regressors** (`gb_battery_model.pkl`, `gb_latency_model.pkl`, `gb_packet_loss_model.pkl`): Heavy-duty predictors capturing non-linear behaviors (e.g. sequence number wraps and step-discharge curves).

### 5.2 Retraining Policy
Autonomous retraining is managed by `src/ml/training_manager.py` (running as a daemon process). Retraining is triggered only if **both** thresholds defined in `configs/settings.json` are satisfied:
1. **New Samples Growth**: At least `500` new records must be added to the unified processed dataset (`wsn_dataset.csv`) since the last successful training run.
2. **Cooldown Period**: At least `24` hours must have elapsed since the last model deployment to prevent CPU thrashing.

### 5.3 Validation-Gated Model Deployment
Retraining does not blindly deploy new models. The daemon enforces a strict **Champion/Candidate Validation Gate**:
1. Splits the historical dataset: **80% training**, **20% validation** (temporally ordered, non-shuffled to prevent future leakage).
2. Trains the candidate model on the training fold.
3. Evaluates both the currently deployed model (champion) and the newly trained model (candidate) on the validation fold.
4. The candidate is promoted and saved to disk only if its validation $R^2$ score is strictly higher than the champion's $R^2$ score:
   $$R^2_{\text{candidate}} > R^2_{\text{champion}}$$
5. Deploys the new model, updates `models/registry.json` with the new version (e.g., `v2`), and logs metrics.

---

## 6. API Interface Specifications

FastAPI exposes system resources grouped logically:

### 6.1 Telemetry & State
- `GET /api/live-data`: Returns the latest atmospheric measurements from all active nodes.
- `GET /api/health`: Uptime monitoring endpoint.

### 6.2 Digital Twins
- `GET /api/twins`: Returns full virtual schemas of all nodes.
- `GET /api/twins/summary`: Aggregate counts (total, online, offline nodes, average health).
- `GET /api/twins/{node_id}`: Query a twin by location, ID, or MAC address.

### 6.3 Machine Learning & Models
- `GET /api/models`: Returns the entire model registry showing all historical candidate performance.
- `GET /api/models/current`: Lists metrics for active champions.
- `GET /api/models/history`: Chronological run logs.
- `GET /api/models/status`: Live retraining status progress (new rows accumulated, cooldown time elapsed, ready flag state).
- `GET /api/anomalies`: Isolation Forest contamination rates and recent flags.
- `GET /api/predictions/temperature` / `GET /api/predictions/humidity`: Weather forecast comparisons.
- `GET /api/network-predictions`: GB-based predictions vs actual values.

### 6.4 Configuration & Systems
- `GET /api/settings` & `POST /api/settings`: Read and modify global variables.
- `GET /api/system-score`: Global Network Health score computation.
- `GET /api/alerts`: Incident center active alarm logs.
- `GET /api/export`: Data exports based on parameter boundaries.

---

## 7. Stateless Demo Mode Replay Engine

For static showcase environments (e.g. web portals) where running MQTT brokers, OpenWeather APIs, or subscriber daemons continuously is impractical, the platform implements a stateless **Demo Mode Replay Engine** inside `src/api/demo.py`.

### Modulo-Clock Indexing
The replay engine intercepts database queries and computes a modulo clock pointer:
$$\text{tick} = \lfloor\frac{\text{unix\_time}}{\text{polling\_interval}}\rfloor$$
$$\text{index} = \text{tick} \pmod{\text{dataset\_length}}$$

It reads from historical logs (`data/logs/*_history.csv`) and rewrites the timestamps to match the current system clock. This keeps the frontend topology connections online (green) without active background physical or simulated hardware streams.
