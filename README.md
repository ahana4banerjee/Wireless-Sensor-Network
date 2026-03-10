# Wireless Environmental Monitoring Network

## Overview
The **Wireless Environmental Monitoring Network (WEMN)** is a distributed sensor system designed to monitor environmental conditions across multiple locations in real time.

The system consists of **multiple Arduino-based sensor nodes** that collect environmental data and transmit it wirelessly to a **central gateway node**. The gateway aggregates the data and forwards it to a **computer dashboard** for monitoring, visualization, and analysis.

This project demonstrates a complete **IoT-style architecture**, combining hardware, wireless communication, and software visualization.

---

## Objectives

- Build a **distributed wireless sensor network**
- Implement **real-time environmental monitoring**
- Demonstrate **embedded system design using Arduino**
- Develop **wireless communication between nodes**
- Visualize sensor data through a **dashboard interface**

---

## System Architecture

The system uses a **multi-node wireless communication model**.

```text
Sensor Node 1
│
Sensor Node 2 ───> Wireless Communication (NRF24L01) ───> Gateway Arduino ───> PC Dashboard
│
Sensor Node 3
```


### Components

**Sensor Nodes**
- Collect environmental data
- Send wireless data packets

**Wireless Layer**
- NRF24L01 RF communication modules

**Gateway Node**
- Receives data from nodes
- Sends data to computer

**Dashboard**
- Displays sensor readings and graphs

---

## System Features

- Multi-node wireless monitoring
- Real-time environmental sensing
- Low-cost IoT architecture
- Modular sensor nodes
- Scalable network design
- Real-time data visualization

---

## Technologies Used

### Hardware
- Arduino Uno
- NRF24L01 RF wireless modules
- Environmental sensors

### Software
- Arduino IDE
- RF24 Communication Library
- Python for dashboard visualization

### Communication
- SPI communication (Arduino ↔ NRF24L01)
- RF wireless data packets

---

## Hardware Components

### Microcontrollers
- Arduino Uno × 3–4

### Wireless Modules
- NRF24L01 RF module × 3–4
- 10µF capacitor × 3

### Sensors
- DHT11 (Temperature & Humidity)
- LDR (Light sensor)
- MQ2 Gas Sensor (Air quality)

### Passive Components
- Resistors (10kΩ)
- Breadboards
- Jumper wires

### Power Supply
- USB power supply
or
- Power bank / battery module

---

## Working Principle

Each **sensor node** performs the following operations:

1. Read environmental sensor data
2. Package the readings into a wireless data packet
3. Transmit the packet using the NRF24L01 module

Example packet:

```text
NodeID:1
Temperature:28°C
Humidity:60%
Light:420
Gas:Safe
```


The **gateway Arduino** continuously listens for packets from sensor nodes.

When data is received:

1. Packet is decoded
2. Node ID is identified
3. Sensor values are forwarded to the computer via serial communication

The **dashboard software** reads this data and displays it in real time.

---

## Phase-wise Implementation

### Phase 1 — Sensor Integration
- Connect sensors to Arduino
- Test readings using Serial Monitor

Example output:

```text
Temperature: 29°C
Humidity: 63%
Light Level: 415
```


---

### Phase 2 — Wireless Communication
- Connect NRF24L01 modules to two Arduinos
- Configure SPI communication
- Test wireless message transfer

Example message:

```text
Node1: 25
```


---

### Phase 3 — Sensor Node Development
Each node includes:

- Arduino Uno
- Sensors
- NRF24L01 module

Node cycle:

1. Read sensors
2. Create data packet
3. Transmit every 5 seconds

---

### Phase 4 — Gateway Development

Gateway Arduino tasks:

- Receive wireless packets
- Decode node information
- Send data to PC via serial port

Example output:


```text
Node1 Temp: 28°C
Node2 Light: 410
Node3 Gas: Safe
```


---

### Phase 5 — Data Visualization

A simple monitoring interface can be built using Python.

Possible features:

- Real-time sensor display
- Graph visualization
- Data logging
- Trend monitoring

---

## Project Timeline

| Week | Tasks |
|-----|------|
| Week 1 | Sensor testing and calibration |
| Week 2 | Wireless communication setup |
| Week 3 | Sensor node construction |
| Week 4 | Gateway development |
| Week 5 | Dashboard development |
| Week 6 | Testing and documentation |

Estimated duration: **4–6 weeks**

---

## Applications

This system can be adapted for multiple real-world scenarios:

- Smart agriculture monitoring
- Greenhouse climate monitoring
- Indoor air quality monitoring
- Smart building monitoring
- Campus environmental sensing
- Industrial safety monitoring

---

## Challenges

Some challenges during development include:

- RF communication stability
- Packet synchronization
- Sensor calibration
- Power management

These challenges resemble real-world **IoT deployment problems**.

---

## Future Improvements

### Data & Analytics
- Cloud data storage
- Long-term data analytics
- Machine learning anomaly detection

### Hardware Improvements
- Low-power sleep mode for nodes
- Solar-powered sensor nodes
- Custom PCB design

### System Features
- SMS/email alerts when thresholds exceed limits
- Mobile monitoring application
- SD card data logging
- LCD display at gateway node

### Networking Enhancements
- Mesh networking
- Long-range LoRa communication
- WiFi-based cloud gateway

---

## Conclusion

The **Wireless Environmental Monitoring Network** demonstrates the implementation of a distributed sensing architecture using low-cost embedded hardware.

By combining **embedded systems, wireless networking, and data visualization**, the project provides practical insight into the design of real-world **IoT monitoring platforms**.

The system highlights how scalable sensor networks can be used to monitor environmental conditions efficiently across multiple locations.
