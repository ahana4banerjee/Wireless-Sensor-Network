import paho.mqtt.client as mqtt
import json
import pandas as pd
import time
import os

# Tracking node health
node_health = {} # { "Mumbai": last_timestamp }
HEALTH_THRESHOLD = 15 # Seconds before marking OFFLINE

def on_message(client, userdata, msg):
    topic_parts = msg.topic.split('/')
    city = topic_parts[1]
    msg_type = topic_parts[2]
    payload = json.loads(msg.payload.decode())

    if msg_type == "status":
        node_health[city] = time.time()
        print(f"--- [HEALTH] Node {city} is alive.")
    
    elif msg_type == "data":
        print(f"--- [DATA] Received from {city}: {payload}")
        save_to_csv(city, payload)

def save_to_csv(city, data):
    folder = "../data/logs"
    os.makedirs(folder, exist_ok=True)
    file_path = f"{folder}/{city}_data.csv"
    
    df = pd.DataFrame([data])
    # header=not os.path.exists prevents duplicate headers
    df.to_csv(file_path, mode='a', index=False, header=not os.path.exists(file_path))

def monitor_nodes():
    """Logic to check for timed-out nodes."""
    now = time.time()
    for city, last_seen in node_health.items():
        if now - last_seen > HEALTH_THRESHOLD:
            print(f"!!! [ALERT] Node {city} is OFFLINE (No heartbeat).")

def start_backend():
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    client.connect("localhost", 1883)
    client.subscribe("wsn/+/+") # Wildcard for all cities and all message types
    
    client.loop_start() # Run in background
    print("Backend Watchdog Active...")
    
    try:
        while True:
            monitor_nodes()
            time.sleep(5)
    except KeyboardInterrupt:
        client.disconnect()

if __name__ == "__main__":
    start_backend()