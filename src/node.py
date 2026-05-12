import time
import json
import random
import requests
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
import os
import argparse

# Load configuration and API Key
load_dotenv()
API_KEY = os.getenv("WEATHER_API_KEY")

# Get the directory where node.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Build the path to settings.json relative to this script
# (Up one level to root, then into configs/)
config_path = os.path.join(BASE_DIR, "..", "configs", "settings.json")

class SensorNode:
    def __init__(self, city, config):
        self.city = city
        self.config = config
        self.client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
        
    def simulate_network(self):
        """Simulates realistic WSN behavior: Packet Loss and Latency."""
        # 1. Packet Loss Simulation
        if random.random() < self.config['simulation']['packet_loss_rate']:
            print(f"[{self.city}] Network Error: Packet dropped (Simulated).")
            return False
        
        # 2. Latency/Delay Simulation
        delay = random.uniform(0, self.config['simulation']['max_delay_ms'] / 1000)
        time.sleep(delay)
        return True

    def fetch_weather(self):
        url = f"http://api.openweathermap.org/data/2.5/weather?q={self.city}&appid={API_KEY}&units=metric"
        try:
            res = requests.get(url)
            return res.json()
        except Exception as e:
            return None

    def start(self):
        self.client.connect(self.config['mqtt']['broker'], self.config['mqtt']['port'])
        print(f"Node {self.city} online.")
        
        last_data_time = 0
        last_heartbeat_time = 0

        try:
            while True:
                current_time = time.time()

                # Send Heartbeat (Status)
                if current_time - last_heartbeat_time >= self.config['simulation']['heartbeat_interval']:
                    if self.simulate_network():
                        status_topic = f"wsn/{self.city}/status"
                        self.client.publish(status_topic, json.dumps({"status": "ONLINE", "ts": current_time}))
                    last_heartbeat_time = current_time

                # Send Weather Data
                if current_time - last_data_time >= self.config['simulation']['update_interval']:
                    if self.simulate_network():
                        data = self.fetch_weather()
                        if data:
                            payload = {
                                "temp": data['main']['temp'],
                                "humidity": data['main']['humidity'],
                                "ts": current_time
                            }
                            data_topic = f"wsn/{self.city}/data"
                            self.client.publish(data_topic, json.dumps(payload))
                            print(f"[{self.city}] Data published.")
                    last_data_time = current_time
                
                time.sleep(1)
        except KeyboardInterrupt:
            self.client.disconnect()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--city", required=True)
    args = parser.parse_args()

    # Use the robust path here
    try:
        with open(config_path) as f:
            conf = json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find config at {config_path}")
        exit(1)

    node = SensorNode(args.city, conf)
    node.start()