# System Architecture

The project follows a layered and modular architecture.

---

# Phase 1 : Software Simulation

```text
+----------------------+
|  Virtual Sensor Node |
|  (Python Process)    |
+----------------------+
            |
            |
            v
+----------------------+
|    MQTT Broker       |
|     (Mosquitto)      |
+----------------------+
            |
            |
            v
+----------------------+
|    Python Backend    |
|                      |
| - Message Processing |
| - Health Monitoring  |
| - CSV Logging        |
| - Fault Detection    |
| - ML Processing      |
+----------------------+
            |
            |
            v
+----------------------+
|    React Frontend    |
|                      |
| - Live Dashboard     |
| - Node Status        |
| - Analytics          |
| - Alerts             |
+----------------------+
```

---

# Phase 2 : PICSimLab Hardware Simulation

```text
+----------------------+
| PICSimLab Nodes      |
| (Virtual Hardware)   |
+----------------------+
            |
            v
+----------------------+
|    MQTT Broker       |
+----------------------+
            |
            v
+----------------------+
|    Python Backend    |
+----------------------+
            |
            v
+----------------------+
|    React Frontend    |
+----------------------+
```

Only the node implementation changes.

---

# Phase 3 : Real Hardware

```text
+----------------------+
| ESP8266 / Arduino    |
| Physical Sensor Node |
+----------------------+
            |
            v
+----------------------+
|    MQTT Broker       |
+----------------------+
            |
            v
+----------------------+
|    Python Backend    |
+----------------------+
            |
            v
+----------------------+
|    React Frontend    |
+----------------------+
```

---

# Backend Responsibilities

* Receive MQTT messages
* Maintain node health
* Store historical data
* Detect faults
* Run ML models
* Serve dashboard data

---

# Frontend Responsibilities

* Live monitoring
* Node visualization
* Weather trends
* WSN health metrics
* Alert management
* Prediction visualization

---

# Design Principle

The project is designed so that:

* MQTT remains unchanged.
* Backend remains unchanged.
* Frontend remains unchanged.

Only the sensor node implementation evolves across phases.
