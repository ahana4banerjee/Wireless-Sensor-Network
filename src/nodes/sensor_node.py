import json
import time
import requests
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
import os

# Load API Key
load_dotenv()
API_KEY = os.getenv("WEATHER_API_KEY")
CITY = "Secunderabad"  # You can change this to any city
BROKER = "localhost"
TOPIC = "wsn/sensors/data"

def fetch_weather_data(city):
    """Fetches real-time weather from OpenWeatherMap API."""
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
    try:
        response = requests.get(url)
        data = response.json()
        
        # Extract specific parameters
        payload = {
            "node_id": city,
            "timestamp": time.time(),
            "temp": data['main']['temp'],
            "humidity": data['main']['humidity'],
            "wind_speed": data['wind']['speed'],
            "status": "active"
        }
        return payload
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

def run_node():
    # Initialize MQTT Client
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.connect(BROKER, 1883, 60)

    print(f"Node started for {CITY}. Sending data every 10 seconds...")

    try:
        while True:
            data = fetch_weather_data(CITY)
            if data:
                # Convert dict to JSON string for transmission
                client.publish(TOPIC, json.dumps(data))
                print(f"Published: {data}")
            
            time.sleep(10) # Wait 10 seconds before next reading
    except KeyboardInterrupt:
        print("Node stopped.")
        client.disconnect()

if __name__ == "__main__":
    run_node()