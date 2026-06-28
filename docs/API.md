# API Specifications & Interface Contracts

This document contains the REST API reference manuals and Pydantic validation schemas for the WSN platform.

---

## 1. System Health & Telemetry

### 1.1 Live Telemetry
*   **Route**: `GET /api/live-data`
*   **Role**: Returns the latest environmental and network telemetry readings for all registered active nodes.
*   **Response Payload (`List[TelemetryRecord]`)**:
    ```json
    [
      {
        "city": "Bangalore",
        "temp": 27.50,
        "humidity": 55.00,
        "pressure": 1012.00,
        "wind_speed": 4.50,
        "battery_level": 98.00,
        "signal_strength": -64.00,
        "latency_ms": 315.41,
        "packet_loss_rate": 0.00,
        "timestamp": "Sun Jun 28 21:48:18 2026"
      }
    ]
    ```

### 1.2 System Health
*   **Route**: `GET /api/health`
*   **Role**: Service connectivity checks.
*   **Response Payload**:
    ```json
    {
      "status": "healthy",
      "service": "wsn-rest-gateway"
    }
    ```

---

## 2. Digital Twins API

### 2.1 Twin State Directory
*   **Route**: `GET /api/twins`
*   **Role**: Fetches the complete software digital twin states for all fleet nodes.
*   **Response Payload**:
    ```json
    {
      "24:0a:c4:08:32:01": {
        "node_id": "24:0a:c4:08:32:01",
        "firmware_version": "2.1.0",
        "battery_level": 98.00,
        "signal_strength": -64.00,
        "latency_ms": 315.41,
        "packet_loss_rate": 0.00,
        "health_score": 93.88,
        "last_heartbeat": 1782665736.02,
        "status": "ONLINE",
        "sensor_values": {
          "temp": 27.50,
          "humidity": 55.00,
          "pressure": 1012.00,
          "wind_speed": 4.50
        }
      }
    }
    ```

### 2.2 Twin Queries
*   **Route**: `GET /api/twins/{node_id}`
*   **Role**: Resolves a specific node twin by its MAC address or location name.
*   **Errors**: `404 Not Found` if the node address is unmapped.

---

## 3. Operational Forecasting & Predictive Support

### 3.1 Fleet Forecast Summary
*   **Route**: `GET /api/predictions/forecast`
*   **Query Parameters**:
    - `horizon` (int, default=72): Forecast timeline length in hours.
    - `step` (int, default=3): Offset interval in hours.
*   **Role**: Returns the forecasted timeline, overall risk status, and operational alerts for all fleet nodes.
*   **Response Payload (`AllNodesForecastSummary`)**:
    ```json
    {
      "total_nodes": 5,
      "critical_risks": 1,
      "high_risks": 1,
      "medium_risks": 2,
      "normal_nodes": 1,
      "nodes": {
        "Bangalore": {
          "city": "Bangalore",
          "forecast_horizon_h": 72,
          "step_hours": 3,
          "overall_risk_level": "MEDIUM",
          "confidence_prediction_intervals": {
            "temperature": "± 2.9°C",
            "humidity": "± 20.7%",
            "latency": "± 553.3ms",
            "packet_loss": "± 4.9%"
          },
          "timeline": [
            {
              "time_offset_h": 0,
              "timestamp": "2026-06-28T22:25:36+00:00",
              "time_label": "Now",
              "temperature": 27.50,
              "humidity": 55.00,
              "pressure": 1012.00,
              "condition": "Clear",
              "battery_level": 98.00,
              "signal_strength": -64.00,
              "latency_ms": 315.41,
              "packet_loss_rate": 0.00,
              "health_score": 93.88,
              "health_status": "EXCELLENT",
              "risk_level": "NORMAL"
            }
          ],
          "operational_insights": []
        }
      }
    }
    ```

### 3.2 Single Node Forecast Details
*   **Route**: `GET /api/predictions/forecast/{node_id}`
*   **Role**: Returns the detailed timeline, prediction intervals, and rule-based maintenance alerts for a specific node ID.

---

## 4. Models & MLOps

### 4.1 Retraining Daemon Status
*   **Route**: `GET /api/models/status`
*   **Role**: Fetches retraining scheduler counters (new CSV samples accumulated, cooldown timer, ready flag).
*   **Response Payload**:
    ```json
    {
      "new_samples_count": 6,
      "new_samples_trigger": 500,
      "hours_since_last_training": 22.36,
      "cooldown_hours_trigger": 24,
      "retraining_ready": false
    }
    ```

### 4.2 Active Champions Registry
*   **Route**: `GET /api/models/current`
*   **Role**: Lists evaluation metrics for currently deployed models.
