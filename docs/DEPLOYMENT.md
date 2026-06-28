# Deployment & Local Installation Guide

This document provides instructions for compiling, configuring, and deploying the Wireless Sensor Network (WSN) Platform on local development machines and staging instances.

---

## 1. Prerequisites

Before installing the system, ensure the following core tools are available on your host system:

### 1.1 Python Runtime
*   **Version**: Python 3.10 or higher.
*   Check version:
    ```bash
    python --version
    ```

### 1.2 Node.js & Package Manager
*   **Version**: Node.js v18 or higher (LTS recommended) and `npm`.
*   Check versions:
    ```bash
    node -v
    npm -v
    ```

### 1.3 MQTT Message Broker
*   The generic firmware and subscribers route messages via a public HiveMQ broker instance: `broker.hivemq.com` on Port `1883`.
*   **Staging/Production**: For secure deployments, install a local **Eclipse Mosquitto** broker and update the credentials in `configs/settings.json`.

---

## 2. Local Installation Steps

### Step 2.1: Clone the Repository
Clone the repository and enter the workspace root:
```bash
git clone https://github.com/your-username/Wireless-Sensor-Network.git
cd Wireless-Sensor-Network
```

### Step 2.2: Setup Python Virtual Environment
Initialize and activate a virtual environment, then install dependencies:
```bash
# Create venv
python -m venv .venv

# Activate venv (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Activate venv (Linux / macOS)
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### Step 2.3: Configure the Client Environment
Create a local environment override file in the `dashboard` directory to direct React queries to your local FastAPI server:
```bash
echo "VITE_API_URL=http://localhost:8000" > dashboard/.env.local
```

### Step 2.4: Install Frontend Node Dependencies
Navigate into the dashboard directory and install package requirements:
```bash
cd dashboard
npm install
cd ..
```

---

## 3. Running System Services

To start the complete platform, run the following three backend services and the Vite frontend server:

### Terminal 1: Ingestion Subscriber & Watchdog
Responsible for subscribing to MQTT telemetry and heartbeats, calculating transmission latency, and updating digital twin states:
```bash
.venv\Scripts\python src/backend.py
```

### Terminal 2: ML Continuous retraining Daemon
Runs a lightweight loop checking sample growth and cooldown limits to retrain regression models in the background:
```bash
.venv\Scripts\python src/ml/training_manager.py
```

### Terminal 3: FastAPI REST Server Gateway
Launches the FastAPI endpoints on port 8000:
```bash
.venv\Scripts\python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 4: Renders Dashboard Server (Vite)
Builds and serves the React dashboard SPA on port 5173:
```bash
cd dashboard
npm run dev
```

Open your browser and navigate to `http://localhost:5173` to explore the dashboard.

---

## 4. Production Deployment

To host this project on cloud platforms like **Render**, **Heroku**, or **AWS**:

### 4.1 Procfile Configuration
The repository includes a root `Procfile` configured to bind FastAPI and uvicorn servers to the cloud host's default dynamic `$PORT`:
```text
web: uvicorn src.api.main:app --host 0.0.0.0 --port $PORT
```

### 4.2 Environmental Flags
On your cloud configuration page, set the following environment variables:
*   `DEMO_MODE=True`: Enables the stateless modulo-clock history replayer to serve coordinates and charts without requiring active background MQTT daemons.
