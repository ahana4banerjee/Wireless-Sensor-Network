import os
import json
from fastapi import APIRouter, HTTPException
from ..schemas import SimulationSettings, SettingsResponse

router = APIRouter()

# Define configuration file path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "..", "configs", "settings.json"))

def load_settings_json():
    if not os.path.exists(CONFIG_PATH):
        raise HTTPException(
            status_code=404,
            detail=f"Configuration file 'settings.json' not found at {CONFIG_PATH}."
        )
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read settings.json: {e}"
        )

def save_settings_json(config_data):
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=4)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write settings.json: {e}"
        )

def validate_simulation_settings(settings: SimulationSettings):
    if not (5 <= settings.data_interval <= 3600):
        raise HTTPException(status_code=400, detail="Data Interval must be between 5 and 3600 seconds.")
    if not (2 <= settings.heartbeat_interval <= 300):
        raise HTTPException(status_code=400, detail="Heartbeat Interval must be between 2 and 300 seconds.")
    if not (0.0 <= settings.packet_loss_rate <= 1.0):
        raise HTTPException(status_code=400, detail="Packet Loss Rate must be between 0.0 and 1.0.")
    if not (0 <= settings.max_delay_ms <= 10000):
        raise HTTPException(status_code=400, detail="Maximum Delay must be between 0 and 10000 milliseconds.")
    if not (0.0 <= settings.battery_discharge_heartbeat <= 10.0):
        raise HTTPException(status_code=400, detail="Battery Discharge (Heartbeat) must be between 0.0 and 10.0.")
    if not (0.0 <= settings.battery_discharge_data <= 10.0):
        raise HTTPException(status_code=400, detail="Battery Discharge (Data) must be between 0.0 and 10.0.")
    if not (0.0 <= settings.battery_discharge_idle <= 10.0):
        raise HTTPException(status_code=400, detail="Battery Discharge (Idle) must be between 0.0 and 10.0.")
    if not (-100.0 <= settings.rssi_baseline <= -30.0):
        raise HTTPException(status_code=400, detail="RSSI Baseline must be between -100.0 and -30.0 dBm.")
    if not (0.0 <= settings.rssi_noise <= 10.0):
        raise HTTPException(status_code=400, detail="RSSI Noise must be between 0.0 and 10.0.")
    if not (1 <= settings.polling_interval <= 60):
        raise HTTPException(status_code=400, detail="Polling Interval must be between 1 and 60 seconds.")

@router.get("/settings", response_model=SettingsResponse)
def get_settings():
    """Reads and returns the active WSN simulation settings configuration."""
    config = load_settings_json()
    
    # Ensure default polling_interval exists if missing from file
    sim_config = config.get("simulation", {})
    if "polling_interval" not in sim_config:
        sim_config["polling_interval"] = 10
        config["simulation"] = sim_config
        save_settings_json(config)
        
    return SettingsResponse(
        mqtt=config.get("mqtt", {}),
        simulation=SimulationSettings(**sim_config),
        cities=config.get("cities", [])
    )

@router.post("/settings", response_model=SettingsResponse)
def update_settings(payload: SimulationSettings):
    """Validates input ranges and overwrites the active simulation settings in settings.json."""
    validate_simulation_settings(payload)
    
    config = load_settings_json()
    config["simulation"] = payload.dict()
    
    save_settings_json(config)
    
    return SettingsResponse(
        mqtt=config.get("mqtt", {}),
        simulation=payload,
        cities=config.get("cities", [])
    )
