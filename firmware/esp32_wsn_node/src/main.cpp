#include <Arduino.h>

// Onboard LED Pin for ESP32 DevKitC
#define LED_PIN 2

unsigned long lastTick = 0;
unsigned int cycleCount = 0;

void setup() {
    // Initialize the Serial port at 115200 bps
    Serial.begin(115200);
    delay(1000); // Give serial monitor time to connect
    
    Serial.println("=========================================");
    Serial.println("  WSN ESP32 Virtual Node Day 1 Initialized");
    Serial.println("=========================================");
    
    // Set LED GPIO pin as output
    pinMode(LED_PIN, OUTPUT);
}

void loop() {
    unsigned long currentMillis = millis();
    
    // Toggle LED and log state every 1000ms using non-blocking timers
    if (currentMillis - lastTick >= 1000) {
        lastTick = currentMillis;
        cycleCount++;
        
        // Read current state and toggle
        bool currentState = digitalRead(LED_PIN);
        digitalWrite(LED_PIN, !currentState);
        
        // Log status to serial UART
        Serial.print("[System Tick] Cycle: ");
        Serial.print(cycleCount);
        Serial.print(" | LED State: ");
        Serial.println(!currentState ? "ON (HIGH)" : "OFF (LOW)");
    }
}
