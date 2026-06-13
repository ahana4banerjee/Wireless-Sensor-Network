import os
import time
import json
import glob
import pandas as pd
from typing import List

# Define absolute paths relative to this module
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "configs", "settings.json"))
LOGS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "logs"))

def is_demo_mode() -> bool:
    """
    Checks if Demo Mode is active.
    Prioritizes environment variables before falling back to configs/settings.json.
    """
    # 1. Environment Variable check (highest priority)
    env_val = os.getenv("DEMO_MODE")
    if env_val is not None:
        return env_val.lower() == "true"
    
    # 2. settings.json configuration fallback
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                config = json.load(f)
                return config.get("simulation", {}).get("demo_mode", False)
        except Exception:
            pass
            
    return False

def get_demo_telemetry_for_all() -> List[dict]:
    """
    Reads the logs of each city, indexing rows by a virtual 'tick' aligned with wall-clock time.
    Calculates index via: index = tick % dataset_length.
    Updates timestamps to the current system time to satisfy watchdog and dashboard visual guidelines.
    """
    telemetry = []
    if not os.path.exists(LOGS_DIR):
        return telemetry
        
    # Read active polling_interval configuration
    polling_interval = 10
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                config = json.load(f)
                polling_interval = config.get("simulation", {}).get("polling_interval", 10)
        except Exception:
            pass
            
    current_time = time.time()
    # Virtual tick increments every polling_interval seconds
    tick = int(current_time / polling_interval)
    
    pattern = os.path.join(LOGS_DIR, "*_history.csv")
    for filepath in glob.glob(pattern):
        filename = os.path.basename(filepath)
        city = filename.replace("_history.csv", "")
        try:
            df = pd.read_csv(filepath)
            if not df.empty:
                # Modulo select row based on the current tick to loop metrics
                idx = tick % len(df)
                row_dict = df.iloc[idx].to_dict()
                
                # Replace NaNs with suitable defaults
                for k, v in row_dict.items():
                    if pd.isna(v):
                        row_dict[k] = 0.0 if k in [
                            "temp", "humidity", "pressure", "wind_speed", "battery_level",
                            "signal_strength", "latency_ms", "packet_loss_rate"
                        ] else ""
                        
                # Overwrite timestamps dynamically to ensure frontend marks the nodes ONLINE
                row_dict["unix_ts"] = current_time
                row_dict["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(current_time))
                row_dict["city"] = city
                row_dict["node_id"] = city
                
                telemetry.append(row_dict)
        except Exception as e:
            print(f"[Demo Engine] Error loading {filename}: {e}")
            
    # Sort nodes alphabetically
    telemetry.sort(key=lambda x: x.get("node_id", ""))
    return telemetry
