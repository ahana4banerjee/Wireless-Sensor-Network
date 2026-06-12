import os
import time
import pandas as pd
import matplotlib.pyplot as plt

# Define absolute paths based on this file's location to ensure it runs from any CWD
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "processed", "wsn_dataset.csv"))
ENV_PLOTS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "plots", "environmental"))
NET_PLOTS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "plots", "network"))
REPORTS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "reports"))

FEATURES = [
    "temp", "humidity", "pressure", "battery_level", 
    "signal_strength", "latency_ms", "packet_loss_rate"
]

def run_data_analysis():
    """
    Performs data validation and exploratory data analysis (EDA) on the processed WSN dataset.
    Generates statistics, distribution plots, a custom correlation matrix, and writes a diagnostic summary report.
    """
    if not os.path.exists(DATASET_PATH):
        print(f"Error: Processed dataset not found at {DATASET_PATH}")
        return None

    # Ensure output directories exist
    os.makedirs(ENV_PLOTS_DIR, exist_ok=True)
    os.makedirs(NET_PLOTS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    print(f"Output directories prepared.")

    try:
        # 1. Load dataset
        df = pd.read_csv(DATASET_PATH)
        total_rows, total_cols = df.shape
        print(f"Loaded dataset: {total_rows} rows, {total_cols} columns.")

        # 2. Quality Checks
        missing_vals = df.isnull().sum()
        duplicates = df.duplicated().sum()
        dtypes = df.dtypes
        desc_stats = df.describe()

        # 3. Generate Individual Distribution Plots
        print("Generating distribution plots...")
        plot_files = []

        # Temp Distribution
        plt.figure(figsize=(6, 4))
        plt.hist(df['temp'], bins=20, color='skyblue', edgecolor='black')
        plt.title('Temperature Distribution')
        plt.xlabel('Temperature (°C)')
        plt.ylabel('Frequency')
        plt.grid(True, linestyle='--', alpha=0.7)
        temp_plot = os.path.join(ENV_PLOTS_DIR, "temperature_distribution.png")
        plt.savefig(temp_plot, dpi=150, bbox_inches='tight')
        plt.close()
        plot_files.append(temp_plot)

        # Humidity Distribution
        plt.figure(figsize=(6, 4))
        plt.hist(df['humidity'], bins=20, color='lightgreen', edgecolor='black')
        plt.title('Humidity Distribution')
        plt.xlabel('Humidity (%)')
        plt.ylabel('Frequency')
        plt.grid(True, linestyle='--', alpha=0.7)
        hum_plot = os.path.join(ENV_PLOTS_DIR, "humidity_distribution.png")
        plt.savefig(hum_plot, dpi=150, bbox_inches='tight')
        plt.close()
        plot_files.append(hum_plot)

        # Battery Level Distribution
        plt.figure(figsize=(6, 4))
        plt.hist(df['battery_level'], bins=20, color='orange', edgecolor='black')
        plt.title('Battery Level Distribution')
        plt.xlabel('Battery Level (%)')
        plt.ylabel('Frequency')
        plt.grid(True, linestyle='--', alpha=0.7)
        bat_plot = os.path.join(NET_PLOTS_DIR, "battery_level_distribution.png")
        plt.savefig(bat_plot, dpi=150, bbox_inches='tight')
        plt.close()
        plot_files.append(bat_plot)

        # Signal Strength Distribution
        plt.figure(figsize=(6, 4))
        plt.hist(df['signal_strength'], bins=20, color='violet', edgecolor='black')
        plt.title('Signal Strength (RSSI) Distribution')
        plt.xlabel('Signal Strength (dBm)')
        plt.ylabel('Frequency')
        plt.grid(True, linestyle='--', alpha=0.7)
        rssi_plot = os.path.join(NET_PLOTS_DIR, "signal_strength_distribution.png")
        plt.savefig(rssi_plot, dpi=150, bbox_inches='tight')
        plt.close()
        plot_files.append(rssi_plot)

        # Latency Distribution
        plt.figure(figsize=(6, 4))
        plt.hist(df['latency_ms'], bins=20, color='coral', edgecolor='black')
        plt.title('Network Latency Distribution')
        plt.xlabel('Latency (ms)')
        plt.ylabel('Frequency')
        plt.grid(True, linestyle='--', alpha=0.7)
        lat_plot = os.path.join(NET_PLOTS_DIR, "latency_distribution.png")
        plt.savefig(lat_plot, dpi=150, bbox_inches='tight')
        plt.close()
        plot_files.append(lat_plot)

        # Packet Loss Distribution
        plt.figure(figsize=(6, 4))
        plt.hist(df['packet_loss_rate'], bins=20, color='salmon', edgecolor='black')
        plt.title('Packet Loss Rate Distribution')
        plt.xlabel('Packet Loss Rate (%)')
        plt.ylabel('Frequency')
        plt.grid(True, linestyle='--', alpha=0.7)
        loss_plot = os.path.join(NET_PLOTS_DIR, "packet_loss_distribution.png")
        plt.savefig(loss_plot, dpi=150, bbox_inches='tight')
        plt.close()
        plot_files.append(loss_plot)

        # Correlation Matrix Heatmap (Using imshow since seaborn is restricted)
        print("Generating correlation heatmap...")
        corr = df[FEATURES].corr()
        fig, ax = plt.subplots(figsize=(8, 6))
        cax = ax.imshow(corr, cmap='coolwarm', vmin=-1, vmax=1)
        fig.colorbar(cax, label='Correlation Coefficient')
        
        # Set ticks and labels
        ax.set_xticks(range(len(FEATURES)))
        ax.set_yticks(range(len(FEATURES)))
        ax.set_xticklabels(FEATURES, rotation=45, ha='right')
        ax.set_yticklabels(FEATURES)
        
        # Annotate matrix values
        for i in range(len(FEATURES)):
            for j in range(len(FEATURES)):
                ax.text(j, i, f"{corr.iloc[i, j]:.2f}", ha='center', va='center', 
                        color='white' if abs(corr.iloc[i, j]) > 0.5 else 'black')
                
        plt.title("Feature Correlation Matrix")
        plt.tight_layout()
        corr_plot = os.path.join(NET_PLOTS_DIR, "correlation_matrix.png")
        plt.savefig(corr_plot, dpi=150, bbox_inches='tight')
        plt.close()
        plot_files.append(corr_plot)

        # 4. Count anomalies
        anomalies_count = 0
        anomaly_pct = 0.0
        if 'anomaly_flag' in df.columns:
            anomalies_count = int((df['anomaly_flag'] == 1).sum())
            anomaly_pct = float(anomalies_count / total_rows * 100.0)

        # 5. Write diagnostic report
        report_path = os.path.join(REPORTS_DIR, "report.txt")
        print(f"Writing diagnostic summary report to {report_path}...")
        
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("====================================================\n")
            f.write("      WSN SIMULATION DATASET ANALYSIS REPORT       \n")
            f.write("====================================================\n\n")
            
            f.write("1. DATASET DIMENSIONS\n")
            f.write("---------------------\n")
            f.write(f"Total Observations (Rows): {total_rows}\n")
            f.write(f"Total Attributes (Columns): {total_cols}\n\n")
            
            f.write("2. DATA TYPES & MISSING VALUES\n")
            f.write("------------------------------\n")
            for col in df.columns:
                f.write(f"- {col:<20} | Type: {str(dtypes[col]):<10} | Missing: {missing_vals[col]}\n")
            f.write(f"\nDuplicate Rows: {duplicates}\n\n")
            
            f.write("3. FEATURE RANGES & STATISTICS\n")
            f.write("------------------------------\n")
            for col in FEATURES:
                if col in df.columns:
                    stats = desc_stats[col]
                    f.write(f"Feature: {col}\n")
                    f.write(f"  Range: [{stats['min']:.2f} to {stats['max']:.2f}]\n")
                    f.write(f"  Mean : {stats['mean']:.2f} | Std: {stats['std']:.2f}\n")
                    f.write(f"  25%  : {stats['25%']:.2f} | 50% (Median): {stats['50%']:.2f} | 75%: {stats['75%']:.2f}\n\n")
            
            f.write("4. ANOMALY DETECTION METRICS\n")
            f.write("----------------------------\n")
            f.write(f"Anomalous Observations Flagged : {anomalies_count}\n")
            f.write(f"Percentage of Dataset anomalous : {anomaly_pct:.2f}%\n\n")
            
            f.write("5. KEY OBSERVATIONS & FINDINGS\n")
            f.write("------------------------------\n")
            # Generate automated insights
            battery_depleted_count = (df['battery_level'] == 0).sum()
            f.write(f"- Battery Life: {battery_depleted_count} observations are logged with completely depleted battery (0.0%).\n")
            
            # Find strongest correlations
            strong_corr = []
            for i in range(len(FEATURES)):
                for j in range(i + 1, len(FEATURES)):
                    c_val = corr.iloc[i, j]
                    if abs(c_val) >= 0.3:
                        strong_corr.append((FEATURES[i], FEATURES[j], c_val))
            
            if strong_corr:
                f.write("- Correlations Spotted:\n")
                for f1, f2, val in strong_corr:
                    direction = "positive" if val > 0 else "negative"
                    f.write(f"  * Moderate/strong {direction} correlation between {f1} and {f2} ({val:.2f})\n")
            else:
                f.write("- Correlations Spotted: No strong correlations found between core features.\n")
                
            f.write("\nReport completed successfully. Ready for predictive modeling validation.\n")
            
        print("Analysis complete!")
        print(f"Generated {len(plot_files)} plots.")
        print(f"Generated 1 report: {report_path}")
        return plot_files + [report_path]

    except Exception as e:
        print(f"Error executing exploratory data analysis: {e}")
        return None

if __name__ == "__main__":
    run_data_analysis()
