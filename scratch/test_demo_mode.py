import urllib.request
import json
import time

def query_api(endpoint):
    url = f"http://127.0.0.1:8000{endpoint}"
    try:
        with urllib.request.urlopen(url) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Error calling {url}: {e}")
        return None

def test_workflow():
    print("--- 1. Testing Health & Initial Settings ---")
    health = query_api("/api/health")
    print(f"Health: {health}")
    
    settings = query_api("/api/settings")
    if settings:
        print(f"Settings Response keys: {list(settings.keys())}")
        print(f"Simulation config: {settings.get('simulation')}")
    
    print("\n--- 2. Testing Nodes Status (Demo Inactive) ---")
    nodes_inactive = query_api("/api/nodes")
    if nodes_inactive:
        print(f"Total active nodes: {nodes_inactive.get('total_nodes')}")
        for n in nodes_inactive.get("nodes", []):
            print(f"  * Node {n['node_id']}: Status={n['status']}, Battery={n['battery_level']}%, RSSI={n['signal_strength']} dBm")

    print("\n--- 3. Enabling Demo Mode via Settings file change ---")
    # Read the settings file, update demo_mode to True, write it back
    import os
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    CONFIG_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "configs", "settings.json"))
    
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config_data = json.load(f)
    
    config_data["simulation"]["demo_mode"] = True
    
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=4)
        
    print("settings.json updated: demo_mode = True")
    time.sleep(1) # wait for settings change sync
    
    print("\n--- 4. Testing Nodes Status (Demo Active) ---")
    nodes_active = query_api("/api/nodes")
    if nodes_active:
        print(f"Total active nodes: {nodes_active.get('total_nodes')}")
        for n in nodes_active.get("nodes", []):
            print(f"  * Node {n['node_id']}: Status={n['status']}, Battery={n['battery_level']}%, RSSI={n['signal_strength']} dBm")
            
    print("\n--- 5. Testing Live Data Replay (Demo Active) ---")
    live_data_1 = query_api("/api/live-data")
    if live_data_1:
        print(f"Live data timestamp 1: {live_data_1[0]['timestamp']} (Bangalore battery: {next(x['battery_level'] for x in live_data_1 if x['city'] == 'Bangalore')}%)")
        
    print("Waiting 11 seconds (polling interval is 10s) to verify replay tick advances...")
    time.sleep(11)
    
    live_data_2 = query_api("/api/live-data")
    if live_data_2:
        print(f"Live data timestamp 2: {live_data_2[0]['timestamp']} (Bangalore battery: {next(x['battery_level'] for x in live_data_2 if x['city'] == 'Bangalore')}%)")

    print("\n--- 6. Disabling Demo Mode for safety ---")
    config_data["simulation"]["demo_mode"] = False
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=4)
    print("settings.json reset: demo_mode = False")

if __name__ == "__main__":
    test_workflow()
