import os
import json
from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any

router = APIRouter()

# Define absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))
REGISTRY_PATH = os.path.join(PROJECT_ROOT, "models", "registry.json")

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
                    "algorithm": entry.get("algorithm")
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
            
    # Sort chronologically by created_time descending (newest first)
    history_sorted = sorted(
        history_entries,
        key=lambda x: x.get("created_time", ""),
        reverse=True
    )
    
    return history_sorted
