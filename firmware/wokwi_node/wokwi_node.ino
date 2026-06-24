#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// --- Configuration Parameters ---
const char* city = "Bangalore";  // Change to Delhi, Mumbai, Hyderabad, or Secunderabad as needed
const char* base_topic = "wsn_ahana_2026";

// WiFi Settings for Wokwi
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// MQTT Settings
const char* mqtt_broker = "broker.hivemq.com";
const int mqtt_port = 1883;

// WSN Simulation Parameters
float battery_level = 100.00;
float rssi_baseline = -60.00;
float rssi_noise    = 3.00;
float packet_loss_rate = 0.05; // 5% packet loss
float max_delay_ms  = 1500.00;

#define LED_PIN 2

// Global clients
WiFiClient espClient;
PubSubClient client(espClient);

// Timing trackers
unsigned long last_data_tx = 0;
unsigned long last_heartbeat_tx = 0;
unsigned long last_battery_update = 0;
unsigned int seqNum = 0;

// Dynamic topic buffers
String status_topic;
String data_topic;

// Helper to simulate normal distribution/noise
float get_signal_strength() {
    float noise = random(-300, 300) / 100.0; // Random noise -3.0 to +3.0
    float rssi = rssi_baseline + noise;
    if (rssi > -30.0) rssi = -30.0;
    if (rssi < -100.0) rssi = -100.0;
    return rssi;
}

// Update battery level based on event cost
void update_battery(const char* eventType) {
    if (strcmp(eventType, "idle") == 0) {
        // Idle discharge: 0.01% per second
        battery_level = max(0.0f, battery_level - 0.01f);
    } else if (strcmp(eventType, "heartbeat") == 0) {
        battery_level = max(0.0f, battery_level - 0.10f);
    } else if (strcmp(eventType, "data") == 0) {
        battery_level = max(0.0f, battery_level - 0.50f);
    }

    if (battery_level <= 0.0) {
        Serial.println("[SYSTEM] Battery depleted (0.0%). Simulating maintenance -> Resetting to 100.0%.");
        battery_level = 100.0;
    }
}

// Simulate latency and network check
bool simulate_network_behavior(float* latency) {
    // 1. Packet Loss Check
    float randCheck = random(0, 100) / 100.0;
    if (randCheck < packet_loss_rate) {
        return false; // Packet dropped
    }

    // 2. Latency delay
    *latency = random(10, max_delay_ms);
    delay(*latency);
    return true;
}

void setup_wifi() {
    delay(10);
    Serial.println();
    Serial.print("Connecting to ");
    Serial.println(ssid);

    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println("");
    Serial.println("WiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
}

void reconnect() {
    // Loop until we're reconnected
    while (!client.connected()) {
        Serial.print("Attempting MQTT connection to ");
        Serial.print(mqtt_broker);
        Serial.print("...");
        
        // Create a unique client ID based on city and random number
        String clientId = "WSN-Node-" + String(city) + "-" + String(random(0xffff), HEX);
        
        if (client.connect(clientId.c_str())) {
            Serial.println("connected");
        } else {
            Serial.print("failed, rc=");
            Serial.print(client.state());
            Serial.println(" try again in 5 seconds");
            // Wait 5 seconds before retrying
            delay(5000);
        }
    }
}

void setup() {
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, HIGH); // LED ON indicates active firmware execution

    Serial.begin(115200);
    setup_wifi();
    
    client.setServer(mqtt_broker, mqtt_port);

    // Build dynamic topic strings
    status_topic = String(base_topic) + "/" + String(city) + "/status";
    data_topic = String(base_topic) + "/" + String(city) + "/data";

    Serial.println("=========================================");
    Serial.print(" WSN ESP32 Wokwi Node: ");
    Serial.println(city);
    Serial.print(" Status Topic: ");
    Serial.println(status_topic);
    Serial.print(" Data Topic: ");
    Serial.println(data_topic);
    Serial.println("=========================================");
    
    last_battery_update = millis();
}

void loop() {
    if (!client.connected()) {
        reconnect();
    }
    client.loop();

    unsigned long now = millis();

    // 1. Every 20 seconds: Heartbeat Status Publish
    if (now - last_heartbeat_tx >= 20000) {
        last_heartbeat_tx = now;
        update_battery("heartbeat");

        float latency = 0.0;
        if (simulate_network_behavior(&latency)) {
            seqNum++;

            // Create JSON status Document
            StaticJsonDocument<256> doc;
            doc["node_id"] = city;
            doc["status"] = "ONLINE";
            doc["ts"] = time(NULL) > 100000 ? time(NULL) : (millis() / 1000.0);
            doc["seq_num"] = seqNum;

            JsonObject metrics = doc.createNestedObject("metrics");
            metrics["battery_level"] = round(battery_level * 100.0) / 100.0;
            metrics["signal_strength"] = get_signal_strength();
            metrics["latency_ms"] = latency;
            metrics["seq_num"] = seqNum;

            // Serialize payload to buffer
            char buffer[256];
            serializeJson(doc, buffer);
            
            // Publish directly over MQTT
            if (client.publish(status_topic.c_str(), buffer)) {
                Serial.print("[MQTT PUBLISHED] Topic: ");
                Serial.print(status_topic);
                Serial.print(" | Payload: ");
                Serial.println(buffer);
            } else {
                Serial.println("[MQTT ERROR] Failed to publish status.");
            }
        } else {
            Serial.println("[System Info] Heartbeat packet dropped (Simulated Loss).");
        }
    }

    // 2. Every 60 seconds: Telemetry Data Publish
    if (now - last_data_tx >= 60000) {
        last_data_tx = now;
        update_battery("data");

        float latency = 0.0;
        if (simulate_network_behavior(&latency)) {
            seqNum++;

            // Create JSON data Document
            StaticJsonDocument<512> doc;
            doc["node_id"] = city;
            doc["ts"] = time(NULL) > 100000 ? time(NULL) : (millis() / 1000.0);
            doc["seq_num"] = seqNum;

            JsonObject metrics = doc.createNestedObject("metrics");
            float tempVal = 28.5 + (random(-20, 20) / 10.0); // Simulated temperature fluctuations
            metrics["temp"] = tempVal;
            metrics["feels_like"] = tempVal + 1.0;
            metrics["humidity"] = 55.0 + random(-5, 5);
            metrics["pressure"] = 1012 + random(-2, 2);
            metrics["wind_speed"] = 3.20;
            metrics["visibility"] = 10000;
            metrics["battery_level"] = round(battery_level * 100.0) / 100.0;
            metrics["signal_strength"] = get_signal_strength();
            metrics["latency_ms"] = latency;
            metrics["seq_num"] = seqNum;
            doc["condition"] = "Clear";

            // Serialize payload to buffer
            char buffer[512];
            serializeJson(doc, buffer);

            // Publish directly over MQTT
            if (client.publish(data_topic.c_str(), buffer)) {
                Serial.print("[MQTT PUBLISHED] Topic: ");
                Serial.print(data_topic);
                Serial.print(" | Payload: ");
                Serial.println(buffer);
            } else {
                Serial.println("[MQTT ERROR] Failed to publish data.");
            }
        } else {
            Serial.println("[System Info] Data telemetry packet dropped (Simulated Loss).");
        }
    }

    // Idle decay loop update every 1s
    if (now - last_battery_update >= 1000) {
        last_battery_update = now;
        update_battery("idle");
        
        // Blink LED briefly to show system is running
        digitalWrite(LED_PIN, LOW);
        delay(50);
        digitalWrite(LED_PIN, HIGH);
    }
}
