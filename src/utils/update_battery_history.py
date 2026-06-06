import os
import csv
import subprocess

# Paths config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "logs"))
MERGE_SCRIPT = os.path.abspath(os.path.join(BASE_DIR, "merge_logs.py"))
ANOMALY_SCRIPT = os.path.abspath(os.path.join(BASE_DIR, "..", "ml", "anomaly_detection.py"))
ANALYSIS_SCRIPT = os.path.abspath(os.path.join(BASE_DIR, "..", "ml", "data_analysis.py"))
PYTHON_EXEC = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".venv", "Scripts", "python.exe"))

# If python exec is not found, fallback to standard python
if not os.path.exists(PYTHON_EXEC):
    PYTHON_EXEC = "python"

def update_battery_levels():
    print("Starting historical battery level update (Simulating Maintenance resets to 100%)...")
    
    if not os.path.exists(LOG_DIR):
        print(f"Error: {LOG_DIR} does not exist.")
        return

    for filename in os.listdir(LOG_DIR):
        if filename.endswith("_history.csv"):
            file_path = os.path.join(LOG_DIR, filename)
            city = filename.replace("_history.csv", "")
            print(f"Updating battery history for {city}...")
            
            # Read existing rows
            rows = []
            with open(file_path, 'r', newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                fieldnames = reader.fieldnames
                for r in reader:
                    rows.append(r)
            
            if not rows:
                print(f"Skipping empty file {filename}")
                continue
            
            # Recalculate battery levels with wrap-around logic
            updated_rows = []
            battery = 100.0
            last_ts = None
            last_seq = None
            
            for idx, row in enumerate(rows):
                unix_ts = float(row['unix_ts'])
                seq_num = int(row['seq_num'])
                
                if last_ts is None:
                    # First row of simulation starts at 100.0
                    battery = 100.0
                else:
                    elapsed = unix_ts - last_ts
                    seq_diff = seq_num - last_seq
                    
                    if elapsed > 600 or seq_diff < 0:
                        # Simulated node reboot / restart
                        battery = 100.0
                    else:
                        status_messages = max(0, seq_diff - 1)
                        # Idle drain (0.005) + Heartbeat drain (0.1) + Data drain (0.5)
                        drain = elapsed * 0.005 + status_messages * 0.1 + 0.5
                        battery -= drain
                        
                        # Reset battery to 100.0 if it hits or drops below 0.0
                        if battery <= 0.0:
                            battery = 100.0
                
                row['battery_level'] = f"{round(battery, 2):.2f}"
                last_ts = unix_ts
                last_seq = seq_num
                updated_rows.append(row)
            
            # Write back the updated rows
            with open(file_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(updated_rows)
            print(f"Finished updating {filename}. Total rows updated: {len(updated_rows)}")

    # Step 2: Merge the logs to regenerate wsn_dataset.csv
    print("\nRegenerating wsn_dataset.csv...")
    subprocess.run([PYTHON_EXEC, MERGE_SCRIPT], check=True)

    # Step 3: Run anomaly detection on the new dataset
    print("\nRe-running anomaly detection...")
    subprocess.run([PYTHON_EXEC, ANOMALY_SCRIPT], check=True)

    # Step 4: Run data analysis to regenerate the report and plots
    print("\nRe-running data analysis...")
    subprocess.run([PYTHON_EXEC, ANALYSIS_SCRIPT], check=True)

    print("\nPipeline execution complete! Battery history updated, merged, anomalies re-detected, and plots regenerated.")

if __name__ == "__main__":
    update_battery_levels()
