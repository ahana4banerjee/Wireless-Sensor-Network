# Intelligent Wireless Sensor Network (WSN) Platform & Simulation

An enterprise-grade, simulation-first IoT platform for distributed Wireless Sensor Networks (WSNs). The system is built around a decoupled architecture where the network protocols, API gateways, and dashboards remain identical, while the telemetry generation source evolves across three distinct implementation phases.

---

## 📅 Three-Phase Development Journey

The platform was designed to solve traditional hardware development constraints by dividing implementation into three progressive stages:

### 🟢 Phase 1 — Software Simulation (Completed)
*   **Purpose**: Model the physical and environmental behaviors of WSN grids entirely in software before working with hardware interfaces.
*   **Implementation**: Five virtual node scripts representing regional hubs (Delhi, Hyderabad, Mumbai, Bangalore, Secunderabad). Each node queries the **OpenWeather API** to seed telemetry with real diurnal weather conditions (temperature, humidity, pressure).
*   **Synthetic Metrics**: Implemented math-based models for Gaussian RSSI noise, linear battery discharge per transmission, and normal-distribution latency spikes.
*   **Protocol**: Message transmission routed through a local Mosquitto broker on wildcard topics using city names as identifiers (e.g., `wsn/{city}/data`).
*   **Status**: ✅ Completed

### 🔵 Phase 2 — Hardware Simulation (Completed)
*   **Purpose**: Retain all downstream databases, API gateways, ML pipelines, and dashboards but replace the Python processes with C++ firmware executing inside simulated microcontrollers.
*   **Implementation**: Generic firmware written in C++ running on simulated **ESP32** microchips inside the **Wokwi** browser sandbox. DHT22 and BMP180 sensors are simulated on the canvas.
*   **Identity Decoupling**: Decoupled locations from firmware. The board queries its unique hardware **eFuse MAC address** on boot (`node_id = "mac"`). The backend Node Registry dynamically binds the MAC address to city coordinates, locations, and settings.
*   **Digital Twin Management**: Created an in-memory Digital Twin layer persisted to `twins_state.json` via atomic swaps, acting as a thread-safe inter-process bridge.
*   **Continuous Learning & MLOps**: Enabled a background retraining daemon monitoring dataset growth and elapsed time to trigger automatic model updates, Promoted new champion models using validation-gated $R^2$ tests.
*   **Operational Intelligence (ODSS)**: Evolved model predictions into a rolling 72-hour forecasting engine, providing deterministic, rule-based maintenance alerts, prediction intervals, and risk badges.
*   **Status**: ✅ Completed

### 🟡 Phase 3 — Real Hardware Deployment (Planned)
*   **Purpose**: Flash the validated Phase 2 C++ firmware directly onto real physical microchips and wire them to environmental sensors.
*   **Implementation**: Flash the identical C++ code using **PlatformIO** onto physical **ESP32 DevKitC** boards. Wire physical DHT22 and BMP180 sensor breakouts.
*   **Zero Downstream Changes**: Real boards publish matching JSON packages over home/office Wi-Fi. The REST API and React dashboard serve physical node measurements with zero changes to code.
*   **Status**: 🚧 Planned (Roadmap)

---

## 📸 Dashboard Showcase

### 1. Mission Control NOC View
Visualizes connection links and gateway statuses, routing dynamic communication paths from the MQTT broker down to geographical points.
<p align="center">
  <img src="docs/screenshots/mission-control.png" alt="Mission Control Dashboard" width="100%">
</p>

### 2. SVG WSN Topology NOC View
Nodes color-code dynamically: Green (Healthy), Yellow (Warning), Red (Watchdog Timeout Offline), and Grey (Disabled) with animated flowlines representing real-time MQTT message streams.
<p align="center">
  <img src="docs/screenshots/topology.png" alt="WSN Topology Map" width="100%">
</p>

### 3. Machine Learning Operations (MLOps)
Visualizes model versions, validation benchmarks ($R^2$, MAE, RMSE), training histories, and live trigger accumulation progress.
<p align="center">
  <img src="docs/screenshots/MLOps-page.png" alt="MLOps Panel" width="100%">
</p>


4. ### Environmental Prediction Engine

Linear Regression models are used to forecast environmental telemetry and compare predicted values against actual observations.

<p align="center">
  <img src="docs/screenshots/environment-prediction.png" alt="Temperature Prediction" width="100%">
</p>


5. ### Network Parameter Prediction Engine

Gradient Boosting models forecast battery behavior, latency, and packet loss to support predictive maintenance and fault prevention.

<p align="center">
  <img src="docs/screenshots/network-prediction.png" alt="Battery Prediction" width="100%">
</p>

---

## 🚀 Key Features

*   **Multi-node WSN Simulation**: Simulates multiple regional sensor nodes with custom battery decay and RF attenuation properties.
*   **Generic ESP32 Firmware**: Decentralized, C++ firmware using hardware MAC addressing to decouple identity.
*   **Digital Twin Management**: Thread-safe in-memory twin layer to decouple ingestion daemons from REST APIs.
*   **Operations Intelligence (ODSS)**: Autoregressive weather and network forecasts for 24h/48h/72h horizons.
*   **Deterministic Insights**: Rules-based explainable directives (e.g. swap battery, inspect gateway, check antennas).
*   **Continuous Learning (MLOps)**: Automated retraining daemon validation-gated via $R^2$ scores, tracked inside the dashboard.
*   **Anomaly Watchdog**: Unsupervised Isolation Forest isolation flags outliers. Watchdogs transition nodes offline after 45s of silence.
*   **Export Center**: Download and query historical sensor readings and diagnostics.

---

## 🛠️ Technology Stack

*   **Embedded & Firmware**: C++, ESP32 Core, Wokwi Web Simulator, PlatformIO, PubSubClient, ArduinoJson
*   **Backend REST Gateway**: Python 3.10+, FastAPI, Uvicorn, Pydantic v2
*   **Message Broker**: MQTT (HiveMQ public broker / local Mosquitto broker)
*   **Database & File Store**: CSV database store, JSON atomic state swaps
*   **Machine Learning**: Scikit-Learn, Joblib, NumPy, Pandas, Matplotlib
*   **Frontend Client**: React 18, Vite, Tailwind CSS, Recharts, Lucide React
*   **Dev Tools**: Powershell, Python Venv, Git, Chrome DevTools

---

## 📁 Folder Structure

```text
Wireless-Sensor-Network/
├── configs/                     # System configurations (settings.json, nodes_registry.json)
├── dashboard/                   # React frontend application (Vite SPA)
│   ├── src/
│   │   ├── components/          # Page components (Overview, Alerts, Predictions, MLOps, Settings)
│   │   ├── services/            # API client wrapper (api.js)
│   │   └── App.jsx              # App layout, lazy routing, and tab caching
├── data/                        # Local file database
│   ├── logs/                    # Rotating logs (backend.log, alerts.log, training.log)
│   ├── processed/               # Merged dataset (wsn_dataset.csv)
│   └── twins/                   # Digital Twin JSON state (twins_state.json)
├── docs/                        # Project documentation reference manuals
│   ├── archive/                 # Retired wireframes, design documents, and design system logs
│   ├── screenshots/             # Visual dashboard PNG assets
│   ├── ARCHITECTURE.md          # Architectural blueprints, topic schemas, and sequence flows
│   ├── CONTEXT.md               # Onboarding reference, engineering philosophies, and decisions
│   ├── API.md                   # REST API routes and Pydantic schemas contract
│   ├── DEPLOYMENT.md            # Installation guide for local and production hosts
│   ├── HARDWARE.md              # Physical wiring pinout and PlatformIO guide
│   └── ML_PIPELINE.md           # MLOps models, equations, and retraining triggers
├── models/                      # Pickled ML models (.pkl) and registry.json
├── plots/                       # Verification charts (comparisons, importances, residuals)
├── predictions/                 # Prediction CSV history files
├── reports/                     # Model metrics validation reports (.txt)
├── src/                         # Python backend source code
│   ├── api/                     # FastAPI endpoint implementation
│   ├── ml/                      # ML pipeline models and continuous learning training manager
│   └── backend.py               # MQTT subscriber daemon & watchdog
├── main.py                      # Multi-node launch orchestrator
├── requirements.txt             # Python dependencies
└── LICENSE                      # Project license file (MIT)
```

---

## 💻 Installation

Detailed installation instructions are available in [docs/DEPLOYMENT.md](file:///d:/Projects/College/Wireless-Sensor-Network/docs/DEPLOYMENT.md).

### Quick Start:

1.  **Clone & Configure virtual environment**:
    ```bash
    git clone https://github.com/your-username/Wireless-Sensor-Network.git
    cd Wireless-Sensor-Network
    python -m venv .venv
    # Windows:
    .venv\Scripts\activate
    # macOS/Linux:
    source .venv/bin/activate
    pip install -r requirements.txt
    ```

2.  **Redirect react requests locally**:
    ```bash
    echo "VITE_API_URL=http://localhost:8000" > dashboard/.env.local
    ```

3.  **Launch backend processes**:
    Open three terminals and run:
    ```bash
    # Terminal 1: Ingestion Subscriber & Watchdog
    python src/backend.py

    # Terminal 2: Background Retraining Daemon
    python src/ml/training_manager.py

    # Terminal 3: FastAPI REST Server
    python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
    ```

4.  **Run Client Dashboard**:
    ```bash
    cd dashboard
    npm install
    npm run dev
    ```
    Open `http://localhost:5173` to explore the dashboard.

---

## 🔮 Future Roadmap

*   Deploy C++ firmware to physical ESP32 boards.
*   Integrate physical DHT22 and BMP180 sensor breakouts.
*   Extend anomaly detection to multi-stage spatial predictions.
*   Containerize application services using Docker and docker-compose.

---

## 👤 Author
**Ahana Banerjee**
*   College Project Portfolio - Wireless Sensor Network Platform.

---

## 📜 Acknowledgements
*   [Wokwi Web Simulator](https://wokwi.com/) for simulated hardware interfaces.
*   [HiveMQ](https://www.hivemq.com/) for public MQTT broker capabilities.
*   [OpenWeatherMap](https://openweathermap.org/) for initial atmospheric readings seed data.
