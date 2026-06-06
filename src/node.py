import time
import json
import random
import requests
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
import os
import argparse

# --- Path Configuration ---
# Ensures the script can find 'settings.json' regardless of where it is run from
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "..", "configs", "settings.json")

# Load Environment Variables (API Key)
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))
API_KEY = os.getenv("WEATHER_API_KEY")

class SensorNode:
    def __init__(self, city, config):
        self.city = city
        self.config = config
        self.broker = config['mqtt']['broker']
        self.port = config['mqtt']['port']
        
        # MQTT Client Setup
        self.client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
        
    def simulate_network_behavior(self):
        """
        Simulates realistic WSN constraints: Packet Loss and Latency.
        Returns False if the packet is 'lost', True otherwise.
        """
        # 1. Packet Loss
        if random.random() < self.config['simulation']['packet_loss_rate']:
            print(f"[{self.city}] Network: Packet dropped.")
            return False
        
        # 2. Latency (Random Delay)
        delay = random.uniform(0, self.config['simulation']['max_delay_ms'] / 1000)
        time.sleep(delay)
        return True

    def fetch_weather_data(self):
        """Fetches comprehensive weather features from OpenWeatherMap."""
        url = f"https://api.openweathermap.org/data/2.5/weather?q={self.city}&appid={API_KEY}&units=metric"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Professional Payload: Flattened for ML and CSV ease
            payload = {
                "node_id": self.city,
                "ts": time.time(),
                "metrics": {
                    "temp": data['main'].get('temp'),
                    "feels_like": data['main'].get('feels_like'),
                    "humidity": data['main'].get('humidity'),
                    "pressure": data['main'].get('pressure'),
                    "wind_speed": data.get('wind', {}).get('speed', 0),
                    "visibility": data.get('visibility', 10000), # Default to 10km if missing
                },
                "condition": data['weather'][0]['main'] if data.get('weather') else "Unknown"
            }
            return payload
        except Exception as e:
            print(f"[{self.city}] API Error: {e}")
            return None

    def start(self):
        """Main loop managing dual frequencies for Status and Data."""
        try:
            self.client.connect(self.broker, self.port, 60)
            print(f"--- Node {self.city} Initialized ---")
            
            last_data_tx = 0
            last_heartbeat_tx = 0

            while True:
                current_time = time.time()

                # 1. Heartbeat Logic (High Frequency)
                if current_time - last_heartbeat_tx >= self.config['simulation']['heartbeat_interval']:
                    if self.simulate_network_behavior():
                        status_topic = f"wsn/{self.city}/status"
                        status_payload = {"node_id": self.city, "status": "ONLINE", "ts": current_time}
                        self.client.publish(status_topic, json.dumps(status_payload))
                    last_heartbeat_tx = current_time

                # 2. Weather Data Logic (Low Frequency)
                if current_time - last_data_tx >= self.config['simulation']['data_interval']:
                    if self.simulate_network_behavior():
                        data_payload = self.fetch_weather_data()
                        if data_payload:
                            data_topic = f"wsn/{self.city}/data"
                            self.client.publish(data_topic, json.dumps(data_payload))
                            print(f"[{self.city}] Data packet sent successfully.")
                    last_data_tx = current_time

                time.sleep(1) # Sleep to prevent CPU spiking

        except KeyboardInterrupt:
            print(f"[{self.city}] Node shutting down...")
            self.client.disconnect()
        except Exception as e:
            print(f"[{self.city}] Critical Node Error: {e}")

if __name__ == "__main__":
    # Setup CLI arguments
    parser = argparse.ArgumentParser(description="WSN Sensor Node Simulation")
    parser.add_argument("--city", required=True, help="Name of the city this node represents")
    args = parser.parse_args()

    # Load Configuration
    try:
        with open(CONFIG_PATH, "r") as f:
            settings = json.load(f)
    except FileNotFoundError:
        print(f"Error: Configuration file not found at {CONFIG_PATH}")
        exit(1)

    # Initialize and Run Node
    node = SensorNode(args.city, settings)
    node.start()