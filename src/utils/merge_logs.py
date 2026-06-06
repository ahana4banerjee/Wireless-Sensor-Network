import os
import pandas as pd

# Define absolute paths based on this file's location to ensure it runs from any CWD
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "logs"))
PROCESSED_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "processed"))
OUTPUT_FILE = os.path.join(PROCESSED_DIR, "wsn_dataset.csv")

def merge_wsn_logs():
    """
    Reads all WSN sensor node CSV logs from data/logs, combines them into
    a single dataset, ensures a unified schema, and sorts them by timestamp.
    """
    if not os.path.exists(LOG_DIR):
        print(f"Error: Log directory not found at {LOG_DIR}")
        return None

    csv_files = [f for f in os.listdir(LOG_DIR) if f.endswith("_history.csv")]
    if not csv_files:
        print(f"No history CSV files found in {LOG_DIR}")
        return None

    dataframes = []
    print(f"Found {len(csv_files)} WSN log files to merge.")

    for filename in csv_files:
        file_path = os.path.join(LOG_DIR, filename)
        city_name = filename.replace("_history.csv", "")
        try:
            df = pd.read_csv(file_path)
            
            # Add city column if it doesn't exist
            if 'city' not in df.columns:
                if 'node_id' in df.columns:
                    df['city'] = df['node_id']
                else:
                    df['city'] = city_name
            
            # Ensure node_id exists and is correct
            if 'node_id' not in df.columns:
                df['node_id'] = city_name

            dataframes.append(df)
            print(f"Loaded {len(df)} rows from {filename}")
        except Exception as e:
            print(f"Error reading {filename}: {e}")

    if not dataframes:
        print("No valid data loaded. Aborting merge.")
        return None

    # Merge all dataframes. pd.concat handles missing columns automatically by filling NaN.
    merged_df = pd.concat(dataframes, ignore_index=True, sort=False)

    # Sort by unix_ts
    if 'unix_ts' in merged_df.columns:
        merged_df = merged_df.sort_values(by='unix_ts').reset_index(drop=True)
    else:
        print("Warning: 'unix_ts' column not found. Output will not be sorted.")

    # Ensure output directory exists
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    # Save to CSV
    merged_df.to_csv(OUTPUT_FILE, index=False)
    print(f"Successfully created unified WSN dataset at: {OUTPUT_FILE}")
    print(f"Merged Dataset Shape: {merged_df.shape}")
    
    return OUTPUT_FILE

if __name__ == "__main__":
    merge_wsn_logs()
