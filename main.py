import multiprocessing
import subprocess
import json
import os
import time

def launch_node(city):
    """Spawns a new process to run a specific city node."""
    print(f"[Master] Launching node for {city}...")
    # Using subprocess to call the node script independently
    subprocess.run(["python", "src/node.py", "--city", city])

if __name__ == "__main__":
    # 1. Load cities from config
    config_path = os.path.join("configs", "settings.json")
    with open(config_path) as f:
        config = json.load(f)
    
    cities = config.get("cities", [])
    processes = []

    print(f"--- WSN Master Runner: Spawning {len(cities)} nodes ---")

    # 2. Start a process for each city
    for city in cities:
        p = multiprocessing.Process(target=launch_node, args=(city,))
        p.start()
        processes.append(p)
        time.sleep(1) # Small stagger to prevent hitting API limits simultaneously

    try:
        for p in processes:
            p.join()
    except KeyboardInterrupt:
        print("\n[Master] Shutting down all nodes...")
        for p in processes:
            p.terminate()