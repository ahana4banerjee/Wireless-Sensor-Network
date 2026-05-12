import paho.mqtt.client as mqtt
import json
import pandas as pd
import time
import os
from collections import deque

# --- Configuration ---
BROKER = "localhost"
PORT = 1883
TOPIC_FILTER = "wsn/+/+"  # Subscribe to all cities and all message types
HEALTH_THRESHOLD = 45     # Seconds before a node is marked OFFLINE
LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "logs")

# --- In-Memory Storage for Dashboard ---
# We keep the last 50 readings for each city to show live graphs later
live_data_buffer = {} # Format: { "Mumbai": deque([...], maxlen=50) }
node_health = {}      # Format: { "Mumbai": last_heartbeat_timestamp }

def flatten_payload(payload):
    """Converts nested metrics into a flat dictionary for CSV/DataFrames."""
    flat = {
        "timestamp": time.ctime(payload['ts']), # Human readable for CSV
        "unix_ts": payload['ts'],              # Machine readable for ML
        "node_id": payload['node_id'],
        "condition": payload.get('condition', 'N/A')
    }
    # Merge the metrics dictionary into the top level
    flat.update(payload.get('metrics', {}))
    return flat

def on_message(client, userdata, msg):
    try:
        topic_parts = msg.topic.split('/')
        city = topic_parts[1]
        msg_type = topic_parts[2]
        payload = json.loads(msg.payload.decode())

        if msg_type == "status":
            node_health[city] = time.time()
            # print(f"[HEALTH] {city} is active.") # Quiet mode for better logs

        elif msg_type == "data":
            flat_data = flatten_payload(payload)
            print(f"[DATA] Received from {city}: {flat_data['temp']}°C, {flat_data['condition']}")
            
            # 1. Update In-Memory Buffer
            if city not in live_data_buffer:
                live_data_buffer[city] = deque(maxlen=50)
            live_data_buffer[city].append(flat_data)
            
            # 2. Log to City-Specific CSV
            save_to_csv(city, flat_data)

    except Exception as e:
        print(f"[ERROR] Backend failed to process message: {e}")

def save_to_csv(city, data):
    """
    Ensures the log directory exists, creates a city-specific CSV if missing,
    and appends data without duplicate headers.
    """
    # 1. 'exist_ok=True' prevents an error if the folder already exists
    os.makedirs(LOG_DIR, exist_ok=True)
    
    file_path = os.path.join(LOG_DIR, f"{city}_history.csv")
    
    # 2. Check if the file exists BEFORE we try to write to it
    file_exists = os.path.isfile(file_path)
    
    # Create the DataFrame from the current reading
    df = pd.DataFrame([data])
    
    # 3. Write to CSV:
    # 'mode=a' appends to the end of the file
    # 'header=not file_exists' only writes the column names if it's a brand new file
    df.to_csv(
        file_path, 
        mode='a', 
        index=False, 
        header=not file_exists, 
        encoding='utf-8'
    )

def monitor_health():
    """Watchdog logic to check for silent nodes."""
    now = time.time()
    for city, last_seen in list(node_health.items()):
        if now - last_seen > HEALTH_THRESHOLD:
            print(f"!!! [ALERT] Node {city} has timed out. Potential Fault Detected.")
            # We keep it in the dict but we could trigger an alert email/notification here

def start_backend():
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    
    try:
        client.connect(BROKER, PORT, 60)
        client.subscribe(TOPIC_FILTER)
        
        # loop_start runs the MQTT processing in a background thread
        client.loop_start()
        print("--- Backend Processor & Watchdog Online ---")
        
        while True:
            monitor_health()
            time.sleep(10) # Check health every 10 seconds
            
    except KeyboardInterrupt:
        print("Shutting down backend...")
        client.disconnect()

if __name__ == "__main__":
    start_backend()