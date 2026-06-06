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
        
        # Simulation parameters
        self.battery_level = 100.0
        self.seq_num = 0
        self.last_battery_update = time.time()
        
        # Load simulation config values with safe fallbacks
        sim_config = config.get('simulation', {})
        self.battery_discharge_heartbeat = sim_config.get('battery_discharge_heartbeat', 0.1)
        self.battery_discharge_data = sim_config.get('battery_discharge_data', 0.5)
        self.battery_discharge_idle = sim_config.get('battery_discharge_idle', 0.01)
        self.rssi_baseline = sim_config.get('rssi_baseline', -60.0)
        self.rssi_noise = sim_config.get('rssi_noise', 3.0)

    def update_battery(self, current_time, event_type=None):
        """Calculates and updates the battery level based on elapsed idle time and events."""
        elapsed = current_time - self.last_battery_update
        self.last_battery_update = current_time
        
        # Idle discharge
        idle_discharge = elapsed * self.battery_discharge_idle
        self.battery_level = max(0.0, self.battery_level - idle_discharge)
        
        # Event discharge (energy consumed during transmission attempts)
        if event_type == 'heartbeat':
            self.battery_level = max(0.0, self.battery_level - self.battery_discharge_heartbeat)
        elif event_type == 'data':
            self.battery_level = max(0.0, self.battery_level - self.battery_discharge_data)

    def get_signal_strength(self):
        """Simulates RSSI with normal distribution noise around a baseline."""
        # RSSI values are normally in the range of -30 to -100 dBm
        noise = random.normalvariate(0, self.rssi_noise)
        rssi = self.rssi_baseline + noise
        return max(-100.0, min(-30.0, round(rssi, 2)))

    def simulate_network_behavior(self):
        """
        Simulates realistic WSN constraints: Packet Loss and Latency.
        Returns (False, 0.0) if the packet is 'lost', (True, latency_ms) otherwise.
        """
        # 1. Packet Loss
        if random.random() < self.config['simulation']['packet_loss_rate']:
            print(f"[{self.city}] Network: Packet dropped.")
            return False, 0.0
        
        # 2. Latency (Random Delay)
        delay = random.uniform(0, self.config['simulation']['max_delay_ms'] / 1000)
        time.sleep(delay)
        return True, round(delay * 1000, 2)

    def fetch_weather_data(self, latency_ms):
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
                "seq_num": self.seq_num,
                "metrics": {
                    "temp": data['main'].get('temp'),
                    "feels_like": data['main'].get('feels_like'),
                    "humidity": data['main'].get('humidity'),
                    "pressure": data['main'].get('pressure'),
                    "wind_speed": data.get('wind', {}).get('speed', 0),
                    "visibility": data.get('visibility', 10000), # Default to 10km if missing
                    "battery_level": round(self.battery_level, 2),
                    "signal_strength": self.get_signal_strength(),
                    "latency_ms": latency_ms,
                    "seq_num": self.seq_num
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
            self.last_battery_update = time.time()

            while True:
                current_time = time.time()
                
                # Update idle battery usage
                self.update_battery(current_time)
                if self.battery_level <= 0:
                    print(f"[{self.city}] Battery depleted. Shutting down node process.")
                    break

                # 1. Heartbeat Logic (High Frequency)
                if current_time - last_heartbeat_tx >= self.config['simulation']['heartbeat_interval']:
                    self.update_battery(current_time, 'heartbeat')
                    if self.battery_level <= 0:
                        print(f"[{self.city}] Battery depleted during heartbeat attempt. Shutting down.")
                        break

                    success, latency_ms = self.simulate_network_behavior()
                    if success:
                        self.seq_num += 1
                        status_topic = f"wsn/{self.city}/status"
                        status_payload = {
                            "node_id": self.city, 
                            "status": "ONLINE", 
                            "ts": current_time,
                            "seq_num": self.seq_num,
                            "metrics": {
                                "battery_level": round(self.battery_level, 2),
                                "signal_strength": self.get_signal_strength(),
                                "latency_ms": latency_ms,
                                "seq_num": self.seq_num
                            }
                        }
                        self.client.publish(status_topic, json.dumps(status_payload))
                    last_heartbeat_tx = current_time

                # 2. Weather Data Logic (Low Frequency)
                if current_time - last_data_tx >= self.config['simulation']['data_interval']:
                    self.update_battery(current_time, 'data')
                    if self.battery_level <= 0:
                        print(f"[{self.city}] Battery depleted during data transmission attempt. Shutting down.")
                        break

                    success, latency_ms = self.simulate_network_behavior()
                    if success:
                        self.seq_num += 1
                        data_payload = self.fetch_weather_data(latency_ms)
                        if data_payload:
                            data_topic = f"wsn/{self.city}/data"
                            self.client.publish(data_topic, json.dumps(data_payload))
                            print(f"[{self.city}] Data packet sent successfully (Seq: {self.seq_num}, Latency: {latency_ms}ms, Battery: {round(self.battery_level, 2)}%).")
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