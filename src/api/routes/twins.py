"""
Digital Twin API Router
=======================
Exposes the real-time Digital Twin state maintained by backend.py.

Endpoints:
    GET /api/twins              — All node twins with full state
    GET /api/twins/summary      — Lightweight summary stats
    GET /api/twins/{node_id}    — Single twin by node_id, location, or MAC
"""

import os
import json
import time
from fastapi import APIRouter, HTTPException
from typing import Any, Dict

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))
TWINS_STATE_PATH = os.path.join(PROJECT_ROOT, "data", "twins", "twins_state.json")


def _read_twins() -> Dict[str, Any]:
    """
    Read Digital Twin state from the shared JSON file.
    Returns an empty dict if the file doesn't exist yet (backend not started).
    """
    if not os.path.exists(TWINS_STATE_PATH):
        return {}
    try:
        with open(TWINS_STATE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read twin state: {e}")


@router.get("/twins")
def get_all_twins():
    """
    Returns the complete Digital Twin registry.
    Each entry contains real-time sensor values, network health metrics,
    computed health score, and online/offline status.
    """
    twins = _read_twins()
    return {
        "count": len(twins),
        "twins": list(twins.values())
    }


@router.get("/twins/summary")
def get_twins_summary():
    """Returns lightweight aggregate stats across all twins."""
    twins = _read_twins()
    if not twins:
        return {"total_nodes": 0, "online_nodes": 0, "offline_nodes": 0, "avg_health_score": None}

    total   = len(twins)
    online  = sum(1 for t in twins.values() if t.get("status") == "ONLINE")
    offline = total - online
    scores  = [t["health_score"] for t in twins.values() if t.get("health_score") is not None]
    avg_health = round(sum(scores) / len(scores), 2) if scores else None

    return {
        "total_nodes":      total,
        "online_nodes":     online,
        "offline_nodes":    offline,
        "avg_health_score": avg_health,
    }


@router.get("/twins/{node_id}")
def get_twin(node_id: str):
    """
    Returns the Digital Twin for a specific node.

    The `node_id` path parameter is resolved in priority order:
      1. Direct key match (location name, e.g. "Bangalore")
      2. Match on `node_id` field (e.g. "node_01")
      3. Match on `mac_address` field (e.g. "24:0a:c4:08:32:01")

    Returns 404 if not found.
    """
    twins = _read_twins()

    # 1. Direct location key
    if node_id in twins:
        return twins[node_id]

    # 2. Match by node_id field or mac_address (case-insensitive, colon-stripped)
    clean_query = node_id.strip().lower().replace(":", "")
    for twin in twins.values():
        if twin.get("node_id") == node_id:
            return twin
        mac = twin.get("mac_address", "") or ""
        if mac.strip().lower().replace(":", "") == clean_query:
            return twin

    raise HTTPException(
        status_code=404,
        detail=f"No Digital Twin found for identifier '{node_id}'. "
               f"Use the node_id, location name, or MAC address."
    )
