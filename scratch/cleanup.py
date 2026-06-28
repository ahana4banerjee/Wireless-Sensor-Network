import os
import glob
import json

PROJECT_ROOT = "d:/Projects/College/Wireless-Sensor-Network"
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
PREDICTIONS_ENV_DIR = os.path.join(PROJECT_ROOT, "predictions", "environmental_predictions")
PREDICTIONS_NET_DIR = os.path.join(PROJECT_ROOT, "predictions", "network_predictions")
PLOTS_NET_DIR = os.path.join(PROJECT_ROOT, "plots", "network")

def clean_models():
    print("--- Cleaning Models ---")
    registry_path = os.path.join(MODELS_DIR, "registry.json")
    
    # 1. Update registry.json
    if os.path.exists(registry_path):
        try:
            with open(registry_path, "r", encoding="utf-8") as f:
                registry = json.load(f)
            
            for key in registry:
                active_ver = registry[key].get("active_version")
                for entry in registry[key].get("history", []):
                    # Point all entries to the canonical unversioned name
                    entry["filename"] = f"{key}.pkl"
            
            with open(registry_path, "w", encoding="utf-8") as f:
                json.dump(registry, f, indent=4)
            print("Successfully updated registry.json to use canonical filenames.")
        except Exception as e:
            print(f"Error updating registry.json: {e}")
            
    # 2. Delete versioned pkl files
    pkl_files = glob.glob(os.path.join(MODELS_DIR, "*.pkl"))
    for file_path in pkl_files:
        filename = os.path.basename(file_path)
        # Check if the filename contains "_v" followed by digits (e.g. temp_model_v1.pkl)
        if "_v" in filename:
            try:
                os.remove(file_path)
                print(f"Deleted versioned model: {filename}")
            except Exception as e:
                print(f"Error deleting {filename}: {e}")

def clean_predictions():
    print("\n--- Cleaning Predictions ---")
    # Clean environmental predictions
    env_files = glob.glob(os.path.join(PREDICTIONS_ENV_DIR, "*"))
    allowed_env = ["temperature_predictions.csv", "humidity_predictions.csv"]
    for file_path in env_files:
        filename = os.path.basename(file_path)
        if filename not in allowed_env:
            try:
                os.remove(file_path)
                print(f"Deleted obsolete environmental prediction: {filename}")
            except Exception as e:
                print(f"Error deleting {filename}: {e}")

    # Clean network predictions
    net_files = glob.glob(os.path.join(PREDICTIONS_NET_DIR, "*"))
    allowed_net = [
        "battery_predictions.csv", 
        "latency_predictions.csv", 
        "packet_loss_predictions.csv",
        "gb_battery_predictions.csv", 
        "gb_latency_predictions.csv", 
        "gb_packet_loss_predictions.csv"
    ]
    for file_path in net_files:
        filename = os.path.basename(file_path)
        if filename not in allowed_net:
            try:
                os.remove(file_path)
                print(f"Deleted obsolete network prediction: {filename}")
            except Exception as e:
                print(f"Error deleting {filename}: {e}")

def clean_plots():
    print("\n--- Cleaning Network Plots ---")
    allowed_plots = [
        "battery_prediction.png",
        "latency_prediction.png",
        "packet_loss_prediction.png",
        "gb_battery_prediction.png",
        "gb_latency_prediction.png",
        "gb_packet_loss_prediction.png",
        "network_health_components.png",
        "network_health_distribution.png",
        "network_health_score.png",
        "network_health_trend.png"
    ]
    plot_files = glob.glob(os.path.join(PLOTS_NET_DIR, "*"))
    for file_path in plot_files:
        filename = os.path.basename(file_path)
        if filename not in allowed_plots:
            try:
                os.remove(file_path)
                print(f"Deleted obsolete network plot: {filename}")
            except Exception as e:
                print(f"Error deleting {filename}: {e}")

if __name__ == "__main__":
    clean_models()
    clean_predictions()
    clean_plots()
    print("\nCleanup successfully completed!")
