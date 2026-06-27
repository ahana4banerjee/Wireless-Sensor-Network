import os
import json
import time
from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any

router = APIRouter()

# Define absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))
REGISTRY_PATH = os.path.join(PROJECT_ROOT, "models", "registry.json")
SETTINGS_PATH = os.path.join(PROJECT_ROOT, "configs", "settings.json")
DATASET_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "wsn_dataset.csv")


def read_registry() -> Dict[str, Any]:
    if not os.path.exists(REGISTRY_PATH):
        raise HTTPException(
            status_code=404,
            detail="Model registry not found. Please ensure the Training Manager service has run at least once."
        )
    try:
        with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read registry.json: {e}")


@router.get("/models")
def get_all_models():
    """Returns the full model registry containing active versions and historical training logs."""
    return read_registry()


@router.get("/models/current")
def get_current_models():
    """Returns the currently active version of each model with its validation metrics."""
    registry = read_registry()
    current_models = {}

    for key, model_info in registry.items():
        active_ver = model_info.get("active_version")
        if not active_ver:
            continue
        for entry in model_info.get("history", []):
            if entry.get("version") == active_ver:
                current_models[key] = {
                    "version": active_ver,
                    "filename": entry.get("filename"),
                    "created_time": entry.get("created_time"),
                    "dataset_size": entry.get("dataset_size"),
                    "metrics": entry.get("metrics"),
                    "algorithm": entry.get("algorithm"),
                    "status": entry.get("status", "active")
                }
                break

    return current_models


@router.get("/models/history")
def get_model_history():
    """Returns a chronologically sorted history of all training runs across all models."""
    registry = read_registry()
    history_entries = []

    for key, model_info in registry.items():
        for entry in model_info.get("history", []):
            entry_copy = entry.copy()
            entry_copy["model_name"] = key
            history_entries.append(entry_copy)

    history_sorted = sorted(
        history_entries,
        key=lambda x: x.get("created_time", ""),
        reverse=True
    )

    return history_sorted


@router.get("/models/status")
def get_models_status():
    """Returns dataset size, retraining policy, last training time and next trigger thresholds."""
    settings = {}
    try:
        with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
            settings = json.load(f)
    except Exception:
        pass

    retraining_cfg = settings.get("retraining", {})
    min_new_samples = retraining_cfg.get("min_new_samples", 500)
    min_hours = retraining_cfg.get("min_time_elapsed_hours", 24)
    check_interval = retraining_cfg.get("check_interval_seconds", 15)

    # Dataset row count
    dataset_size = 0
    try:
        import pandas as pd
        if os.path.exists(DATASET_PATH):
            df = pd.read_csv(DATASET_PATH, header=0, on_bad_lines="skip")
            dataset_size = max(0, len(df) - 1)
    except Exception:
        pass

    # Last training time from registry (newest entry across all models)
    last_training_time = None
    last_training_dataset_size = 0
    try:
        registry = read_registry()
        all_times = []
        for model_info in registry.values():
            for entry in model_info.get("history", []):
                ct = entry.get("created_time")
                ds = entry.get("dataset_size", 0)
                if ct:
                    all_times.append((ct, ds))
        if all_times:
            all_times.sort(key=lambda x: x[0], reverse=True)
            last_training_time, last_training_dataset_size = all_times[0]
    except Exception:
        pass

    # Elapsed hours since last training
    elapsed_hours = None
    if last_training_time:
        try:
            from datetime import datetime, timezone
            last_dt = datetime.fromisoformat(last_training_time.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            elapsed_hours = round((now_dt - last_dt).total_seconds() / 3600, 2)
        except Exception:
            pass

    new_samples_since_last = max(0, dataset_size - last_training_dataset_size)
    sample_trigger_ready = new_samples_since_last >= min_new_samples
    time_trigger_ready = (elapsed_hours is not None and elapsed_hours >= min_hours)
    retrain_ready = sample_trigger_ready and time_trigger_ready

    return {
        "dataset_size": dataset_size,
        "last_training_time": last_training_time,
        "last_training_dataset_size": last_training_dataset_size,
        "new_samples_since_last_training": new_samples_since_last,
        "elapsed_hours_since_training": elapsed_hours,
        "retraining_policy": {
            "min_new_samples": min_new_samples,
            "min_time_elapsed_hours": min_hours,
            "check_interval_seconds": check_interval
        },
        "trigger_status": {
            "sample_trigger_ready": sample_trigger_ready,
            "time_trigger_ready": time_trigger_ready,
            "retrain_ready": retrain_ready
        }
    }
