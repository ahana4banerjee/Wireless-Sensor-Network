# Intelligent Wireless Sensor Network (WSN) Simulation

## Overview

This project is an end-to-end implementation of an **Intelligent Wireless Sensor Network (WSN)** using a **simulation-first development approach**.

Instead of immediately building hardware nodes, the complete networking, communication, monitoring, analytics, and visualization pipeline is first developed in software. Once validated, the same architecture will be migrated to hardware simulation and eventually real devices.

The project combines concepts from:

* IoT
* Wireless Sensor Networks
* MQTT Communication
* Distributed Systems
* Data Analytics
* Machine Learning
* Full Stack Development

---

# Development Roadmap

The project is divided into three major phases.

## Phase 1 : Software Simulation (Current)

Build the complete WSN ecosystem using Python-based virtual sensor nodes.

  ### Current Progress

Completed:

* Multi-node WSN simulation (Hyderabad, Delhi, Mumbai, Bangalore, Secunderabad)
* OpenWeather API integration
* MQTT communication
* Battery depletion and maintenance wrap-around simulation (auto-resets to 100% on depletion)
* Signal strength (RSSI) simulation with Gaussian noise
* Latency and transmission delay simulation
* Packet loss calculation based on sequence number gaps
* Standalone watchdog and database schema migration (auto-aligns headers on startup)
* Rule-based state-tracking Fault Diagnostics engine (logs to `alerts.log`)
* Aggregated historical dataset merging (`wsn_dataset.csv` with 2,370+ rows)
* Unsupervised Anomaly Detection using Isolation Forest (`anomaly_flag` column added)
* Exploratory Data Analysis & visual distribution plotting (Matplotlib)

Current Dataset:

* 5 Virtual Nodes
* Bangalore
* Delhi
* Hyderabad
* Mumbai
* Secunderabad

Approximately:

* 470+ records per node
* 2370+ observations collected

---

### Remaining Work in Phase 1

#### Step 1: Frontend Development

Build React Dashboard:

* Live sensor monitoring
* Node status
* Network health
* Weather trends
* Alerts
* Analytics

React is intentionally chosen instead of Streamlit to provide a better user experience and a production-style frontend architecture.

---

#### Step 2: Predictive Machine Learning

* Temperature prediction
* Network behavior analysis

---

## Phase 2 : Hardware Simulation

Replace Python virtual nodes with simulated hardware using PICSimLab.

Goals:

* Simulate embedded devices
* Preserve MQTT architecture
* Preserve backend
* Preserve frontend

Only the sensor nodes should change.

---

## Phase 3 : Real Hardware Implementation (Optional)

If time permits, replace simulated nodes with physical devices.

Possible hardware:

* ESP8266
* Arduino
* Environmental sensors

The backend and frontend should continue to work without modification.

---

# Current Architecture

```text
Virtual Sensor Nodes
        │
        ▼
MQTT Communication
        │
        ▼
Python Backend
        │
        ├── Health Monitoring (Watchdog)
        ├── CSV Logging & Auto-migration
        ├── Fault Diagnostics (Stateful alerts.log)
        └── ML Processing (Isolation Forest Anomaly tagging)
        │
        ▼
React Dashboard
```

---

# Current Data Format

The processed master dataset contains the following attributes:

```text
timestamp
unix_ts
node_id
condition
temp
feels_like
humidity
pressure
wind_speed
visibility
battery_level
signal_strength
latency_ms
packet_loss_rate
seq_num
city
anomaly_flag
```

---

# Technologies

## Backend

* Python
* pandas
* paho-mqtt

## Communication

* MQTT (Mosquitto)

## Data Source

* OpenWeather API

## Frontend

* React

## Machine Learning & Visualization

* scikit-learn
* statsmodels
* matplotlib

## Hardware Simulation

* PICSimLab

## Future Hardware

* ESP8266 / Arduino

---

# Setup & Execution Instructions

### 1. Environment Configuration
Create a virtual environment and install the required dependencies:
```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```
Make sure to create a `.env` file in the root directory containing your OpenWeather API key:
```env
WEATHER_API_KEY=your_openweather_api_key
```

### 2. Start the Backend Ingestion & Watchdog
Run the subscriber backend. It will perform automatic schema migrations on existing history files and listen for node broadcasts:
```bash
.venv\Scripts\python src/backend.py
```

### 3. Launch the Virtual WSN Nodes
You can launch multiple virtual nodes (e.g., Delhi, Hyderabad) in separate terminals using:
```bash
.venv\Scripts\python src/node.py --city Delhi
.venv\Scripts\python src/node.py --city Hyderabad
```

### 4. Run the Data Pipeline & EDA
To update the battery history logs, compile the unified dataset, identify anomalies, and regenerate exploratory plots:
```bash
.venv\Scripts\python src/utils/update_battery_history.py
```

---

# Design Philosophy

The objective is to develop a modular WSN architecture where only the sensor nodes change across different phases.

Simulation → Hardware Simulation → Real Hardware

The communication, backend, analytics, and frontend layers should remain reusable throughout the project.
