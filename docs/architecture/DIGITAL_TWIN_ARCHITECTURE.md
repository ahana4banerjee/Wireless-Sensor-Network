# Digital Twin Architecture

This document describes the **Digital Twin Management Layer** introduced into the Intelligent WSN Platform. Every physical or simulated sensor node has a corresponding software twin maintained in real time by the backend.

---

## 1. Concept

A **Digital Twin** is a continuously updated virtual representation of a physical device. Instead of clients reading raw, transient MQTT packets, they query a structured, computed state object that encodes the full observed reality of the node at any moment.

```
Physical / Simulated Node
       │  MQTT
       ▼
 MQTT Broker (broker.hivemq.com)
       │  wsn_ahana_2026/+/+
       ▼
 backend.py  ──▶  DigitalTwinManager.update_twin()
                        │
                        ▼  (atomic JSON write)
              data/twins/twins_state.json
                        │
                        ▼  (file read)
              FastAPI  GET /api/twins
              FastAPI  GET /api/twins/{node_id}
                        │
                        ▼
              React Dashboard
```

---

## 2. Twin Schema

Each twin entry in `data/twins/twins_state.json` contains:

| Field | Type | Description |
|---|---|---|
| `node_id` | str | Raw MQTT topic segment (e.g. `node_01` or MAC) |
| `location` | str | Human-readable city/region name (e.g. `Bangalore`) |
| `coordinates` | dict | `{lat, lon}` from Node Registry |
| `sensor_type` | str | Hardware sensor spec from Node Registry |
| `firmware_version` | str | Firmware version string from Node Registry |
| `mac_address` | str \| null | eFuse MAC address if registered |
| `status` | str | `ONLINE` or `OFFLINE` |
| `last_heartbeat` | float | Unix timestamp of most recent status/data packet |
| `last_data` | float \| null | Unix timestamp of most recent data packet |
| `temperature` | float \| null | Latest °C reading |
| `humidity` | float \| null | Latest % reading |
| `pressure` | float \| null | Latest hPa reading |
| `condition` | str \| null | Weather condition string |
| `battery_level` | float \| null | Battery % |
| `signal_strength` | float \| null | RSSI dBm |
| `latency_ms` | float \| null | Round-trip latency ms |
| `packet_loss_rate` | float \| null | Calculated packet loss % |
| `seq_num` | int \| null | Last observed MQTT sequence number |
| `health_score` | float \| null | Composite 0–100 score (see §3) |
| `created_at` | float | Unix timestamp when twin was first created |
| `updated_at` | float \| null | Unix timestamp of last mutation |

---

## 3. Health Score Computation

The `health_score` is a weighted composite of four key network metrics, scored 0–100:

| Metric | Weight | Scoring Rule |
|---|---|---|
| Battery Level | 30% | Linearly maps [0%, 100%] → [0, 100] |
| Signal Strength | 25% | Maps [-100, -30] dBm → [0, 100] (stronger = better) |
| Latency | 25% | Maps [0, 2000ms] → [100, 0] (lower = better) |
| Packet Loss | 20% | Maps [0%, 100%] → [100, 0] (lower = better) |

A node with full battery, -45 dBm signal, 50ms latency, and 0% loss would score ≈ 97.

---

## 4. Inter-Process State Sharing

`backend.py` and `uvicorn` are separate OS processes. To share twin state without a database:

| Approach | Used Here | Production Equivalent |
|---|---|---|
| JSON file (`twins_state.json`) | ✅ | Redis / DynamoDB |
| Shared memory | ❌ (not cross-process safe) | – |
| SQLite | Alternative | PostgreSQL |

Writes use a **temp-file atomic swap** (`os.replace`) to prevent partial reads.

---

## 5. Update Lifecycle

```
MQTT data packet arrives
        │
        ▼
on_message() parses topic → extracts node_id + msg_type
        │
        ▼
resolve_node_id() → city/location string
        │
        ├──▶ [status] twin_manager.update_twin(node_id, city, payload, "status")
        │         Updates: last_heartbeat, status=ONLINE, battery/signal if present
        │
        └──▶ [data]   twin_manager.update_twin(node_id, city, flat_data, "data")
                  Updates: all sensor values + network metrics + health_score
                       │
                       ▼
               twins_state.json (atomic write)
```

**Watchdog integration**: The `monitor_health()` loop in `backend.py` calls `twin_manager.mark_offline(location)` whenever a node exceeds the 45-second heartbeat timeout, keeping the twin's `status` field accurate even when no packets are arriving.

---

## 6. API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/twins` | All twins with full state; includes `count` |
| `GET /api/twins/summary` | Aggregate stats (total, online, offline, avg health) |
| `GET /api/twins/{node_id}` | Single twin — resolves by location name, node_id, or MAC |

---

## 7. Phase 3 Physical ESP32 Compatibility

When a real ESP32 board is flashed with the generic firmware and configured with `node_id = "mac"`:

1. The board reads its eFuse MAC address on boot → publishes to `wsn_ahana_2026/24:0a:c4:08:32:01/data`
2. `backend.py` receives the packet, resolves the MAC via `nodes_registry.json` → `"Bangalore"`
3. `twin_manager.update_twin("24:0a:c4:08:32:01", "Bangalore", data, "data")` is called
4. The `Bangalore` twin is updated with live hardware sensor readings

**Zero code changes are required in the twin layer, the API layer, or the dashboard** — only a registry entry is needed.

---

## 8. Extending the Twin

To add a new field to the twin schema:
1. Add the field with a `None` default in `_empty_twin()` in `digital_twin_manager.py`
2. Populate it in `update_twin()` from the incoming MQTT payload
3. The field is immediately available via all twin API endpoints
