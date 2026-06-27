"""
Digital Twin Manager
====================
Maintains an in-memory + file-persisted software representation (Digital Twin)
for every physical or simulated WSN node.

Each twin stores real-time sensor values, network health metrics, firmware
metadata, and an online/offline status derived from heartbeat timestamps.

Inter-process sharing strategy:
    backend.py  ──writes──▶  data/twins/twins_state.json  ◀──reads──  uvicorn
This mirrors the role Redis would play in a production deployment.
"""

import os
import json
import time
import threading
import logging

logger = logging.getLogger("DigitalTwinManager")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
TWINS_DIR = os.path.join(PROJECT_ROOT, "data", "twins")
TWINS_STATE_PATH = os.path.join(TWINS_DIR, "twins_state.json")
REGISTRY_PATH = os.path.join(PROJECT_ROOT, "configs", "nodes_registry.json")

# A node is considered OFFLINE if no packet received in this many seconds
OFFLINE_THRESHOLD_SECONDS = 45

# ─── Health score weights ──────────────────────────────────────────────────────
# Weighted contribution of each metric to the composite health score (0–100)
HEALTH_WEIGHTS = {
    "battery":      0.30,
    "signal":       0.25,
    "latency":      0.25,
    "packet_loss":  0.20,
}


def _compute_health_score(battery: float, signal_dbm: float,
                           latency_ms: float, packet_loss: float) -> float:
    """
    Returns a composite health score 0–100 from the four key network metrics.

    Scoring rules (each component scored 0–100 before weighting):
      battery      — linearly maps [0, 100] % → [0, 100]
      signal_dbm   — maps [-100, -30] dBm → [0, 100]  (stronger = better)
      latency_ms   — maps [0, 2000] ms   → [100, 0]   (lower = better)
      packet_loss  — maps [0, 100] %     → [100, 0]   (lower = better)
    """
    bat_score  = max(0.0, min(100.0, battery))
    sig_score  = max(0.0, min(100.0, (signal_dbm + 100) / 70 * 100))
    lat_score  = max(0.0, min(100.0, (1 - latency_ms / 2000) * 100))
    loss_score = max(0.0, min(100.0, (1 - packet_loss / 100) * 100))

    score = (
        bat_score  * HEALTH_WEIGHTS["battery"] +
        sig_score  * HEALTH_WEIGHTS["signal"]  +
        lat_score  * HEALTH_WEIGHTS["latency"] +
        loss_score * HEALTH_WEIGHTS["packet_loss"]
    )
    return round(score, 2)


def _empty_twin(node_id: str, registry_entry: dict = None) -> dict:
    """Returns a default twin skeleton for a node not yet seen on MQTT."""
    reg = registry_entry or {}
    return {
        # Identity
        "node_id":          node_id,
        "location":         reg.get("location", node_id),
        "coordinates":      reg.get("coordinates", {}),
        "sensor_type":      reg.get("sensor_type", "Unknown"),
        "firmware_version": reg.get("firmware_version", "Unknown"),
        "mac_address":      reg.get("mac_address", None),
        # Status
        "status":           "OFFLINE",
        "last_heartbeat":   None,
        "last_data":        None,
        # Sensor values
        "temperature":      None,
        "humidity":         None,
        "pressure":         None,
        "condition":        None,
        # Network metrics
        "battery_level":    None,
        "signal_strength":  None,
        "latency_ms":       None,
        "packet_loss_rate": None,
        "seq_num":          None,
        # Computed
        "health_score":     None,
        # Meta
        "created_at":       time.time(),
        "updated_at":       None,
    }


class DigitalTwinManager:
    """
    Thread-safe manager for the Digital Twin state store.

    Responsibilities:
    - Scaffold twins from nodes_registry.json on startup.
    - Accept MQTT-derived updates from backend.py.
    - Persist state to twins_state.json after every update.
    - Expose read methods consumed by the FastAPI twins router.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._twins: dict[str, dict] = {}
        os.makedirs(TWINS_DIR, exist_ok=True)
        self._load_state()
        self._scaffold_from_registry()

    # ── Persistence ────────────────────────────────────────────────────────────

    def _load_state(self):
        """Load existing twin state from disk (survives process restarts)."""
        if os.path.exists(TWINS_STATE_PATH):
            try:
                with open(TWINS_STATE_PATH, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    if isinstance(loaded, dict):
                        self._twins = loaded
                        logger.info(f"[DigitalTwin] Loaded {len(self._twins)} twins from disk.")
            except Exception as e:
                logger.warning(f"[DigitalTwin] Could not load state file: {e}. Starting fresh.")

    def _save_state(self):
        """Atomically write twin state to disk using a temp-file swap."""
        tmp_path = TWINS_STATE_PATH + ".tmp"
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(self._twins, f, indent=2)
            os.replace(tmp_path, TWINS_STATE_PATH)
        except Exception as e:
            logger.error(f"[DigitalTwin] Failed to persist state: {e}")

    def _scaffold_from_registry(self):
        """Pre-populate twins for all registered nodes if not already present."""
        if not os.path.exists(REGISTRY_PATH):
            return
        try:
            with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
                registry = json.load(f)
            changed = False
            for node_id, entry in registry.items():
                if node_id not in self._twins:
                    self._twins[node_id] = _empty_twin(node_id, entry)
                    changed = True
                    logger.info(f"[DigitalTwin] Scaffolded twin for {node_id} ({entry.get('location')})")
                else:
                    # Refresh registry-sourced metadata in case registry was updated
                    self._twins[node_id]["location"]         = entry.get("location", node_id)
                    self._twins[node_id]["coordinates"]      = entry.get("coordinates", {})
                    self._twins[node_id]["sensor_type"]      = entry.get("sensor_type", "Unknown")
                    self._twins[node_id]["firmware_version"] = entry.get("firmware_version", "Unknown")
                    self._twins[node_id]["mac_address"]      = entry.get("mac_address")
                    changed = True
            if changed:
                self._save_state()
        except Exception as e:
            logger.error(f"[DigitalTwin] Failed to scaffold from registry: {e}")

    # ── Write API (called by backend.py) ───────────────────────────────────────

    def update_twin(self, node_id: str, location: str, data: dict, msg_type: str = "data"):
        """
        Update or create a twin from an incoming MQTT packet.

        Args:
            node_id:  Raw MQTT topic segment (e.g. "node_01" or a MAC address).
            location: Resolved city/location string (e.g. "Bangalore").
            data:     Flattened telemetry dict from backend flatten_payload().
            msg_type: "data" or "status".
        """
        now = time.time()

        with self._lock:
            # Use the location as the canonical twin key for backward compatibility
            key = location

            # Bootstrap new twin if not yet seen
            if key not in self._twins:
                self._twins[key] = _empty_twin(key)
                self._twins[key]["node_id"]  = node_id
                self._twins[key]["location"] = location

            twin = self._twins[key]
            twin["node_id"]  = node_id
            twin["location"] = location
            twin["status"]   = "ONLINE"
            twin["updated_at"] = now

            if msg_type == "status":
                twin["last_heartbeat"] = now
                # Update network metrics from status heartbeat if present
                if "battery_level" in data:
                    twin["battery_level"] = data.get("battery_level")
                if "signal_strength" in data:
                    twin["signal_strength"] = data.get("signal_strength")

            elif msg_type == "data":
                twin["last_heartbeat"] = now
                twin["last_data"]      = now

                # Sensor readings
                twin["temperature"]  = data.get("temp")
                twin["humidity"]     = data.get("humidity")
                twin["pressure"]     = data.get("pressure")
                twin["condition"]    = data.get("condition")

                # Network metrics
                twin["battery_level"]    = data.get("battery_level")
                twin["signal_strength"]  = data.get("signal_strength")
                twin["latency_ms"]       = data.get("latency_ms")
                twin["packet_loss_rate"] = data.get("packet_loss_rate")
                twin["seq_num"]          = data.get("seq_num")

                # Computed health score
                twin["health_score"] = _compute_health_score(
                    battery=float(twin["battery_level"] or 0),
                    signal_dbm=float(twin["signal_strength"] or -80),
                    latency_ms=float(twin["latency_ms"] or 0),
                    packet_loss=float(twin["packet_loss_rate"] or 0),
                )

            self._save_state()

    def mark_offline(self, location: str):
        """Mark a twin as OFFLINE (called by the watchdog in backend.py)."""
        with self._lock:
            if location in self._twins:
                self._twins[location]["status"] = "OFFLINE"
                self._twins[location]["updated_at"] = time.time()
                self._save_state()

    # ── Read API (called by FastAPI twins router) ──────────────────────────────

    def get_all(self) -> dict:
        """Returns snapshot of all twins."""
        with self._lock:
            return dict(self._twins)

    def get_by_id(self, query: str):
        """
        Returns a single twin by node_id key, location name, or raw MQTT node_id.
        Returns None if not found.
        """
        with self._lock:
            # Direct key lookup (location-keyed)
            if query in self._twins:
                return self._twins[query]
            # Search by node_id field
            for twin in self._twins.values():
                if twin.get("node_id") == query:
                    return twin
            return None

    def get_summary(self) -> dict:
        """Returns a lightweight summary for dashboard stat cards."""
        with self._lock:
            total   = len(self._twins)
            online  = sum(1 for t in self._twins.values() if t.get("status") == "ONLINE")
            offline = total - online
            scores  = [t["health_score"] for t in self._twins.values()
                       if t.get("health_score") is not None]
            avg_health = round(sum(scores) / len(scores), 2) if scores else None
            return {
                "total_nodes":     total,
                "online_nodes":    online,
                "offline_nodes":   offline,
                "avg_health_score": avg_health,
            }


# ── Module-level singleton ─────────────────────────────────────────────────────
# Importing this from anywhere in the same Python process gives the same instance.
twin_manager = DigitalTwinManager()
