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

* Multi-node WSN simulation
* OpenWeather API integration
* MQTT communication
* Packet loss simulation
* Network latency simulation
* Heartbeat mechanism
* Backend data processing
* CSV logging
* Multi-process node execution

Current Dataset:

* 5 Virtual Nodes
* Hyderabad
* Delhi
* Mumbai
* Bangalore
* Secunderabad

Approximately:

* 400 records per node
* 2000+ observations collected

---

### Remaining Work in Phase 1

#### Step 1

Enhance node simulation.

Add:

* Battery simulation
* Signal strength simulation
* Latency metrics
* Packet loss metrics

---

#### Step 2

Improve backend processing.

Implement:

* WSN health monitoring
* Fault detection
* Alert generation

---

#### Step 3

Create unified dataset.

* Merge node logs
* Prepare data for analytics

---

#### Step 4

Build React Dashboard.

Features:

* Live sensor monitoring
* Node status
* Network health
* Weather trends
* Alerts
* Analytics

React is intentionally chosen instead of Streamlit to provide a better user experience and a production-style frontend architecture.

---

#### Step 5

Machine Learning.

Implement:

* Anomaly detection
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
        ├── Health Monitoring
        ├── CSV Logging
        ├── Fault Detection
        └── ML Processing
        │
        ▼
React Dashboard
```

---

# Current Data Format

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
```

Future WSN attributes:

```text
battery_level
signal_strength
latency_ms
packet_loss
anomaly_flag
```

---

# Technologies

## Backend

* Python
* pandas
* paho-mqtt

## Communication

* MQTT

## Data Source

* OpenWeather API

## Frontend

* React

## Machine Learning

* scikit-learn
* statsmodels

## Hardware Simulation

* PICSimLab

## Future Hardware

* ESP8266 / Arduino

---

# Design Philosophy

The objective is to develop a modular WSN architecture where only the sensor nodes change across different phases.

Simulation → Hardware Simulation → Real Hardware

The communication, backend, analytics, and frontend layers should remain reusable throughout the project.
