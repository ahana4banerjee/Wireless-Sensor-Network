import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Define absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "processed", "wsn_dataset.csv"))
PLOTS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "plots", "network"))
REPORTS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "reports"))
PREDICTIONS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "predictions", "network_predictions"))

def calculate_nhi_components(df):
    """
    Applies deterministic engineering rules to calculate subscores:
    - battery_score: battery_level (0-100)
    - signal_score: RSSI scaled between -90 dBm (0) and -50 dBm (100)
    - latency_score: latency scaled between 1500 ms (0) and 100 ms (100)
    - packet_loss_score: packet loss scaled between 10% (0) and 0% (100)
    """
    # 1. Battery Score
    df["battery_score"] = np.clip(df["battery_level"], 0.0, 100.0)
    
    # 2. Signal Score (Linear interpolation: -90 dBm -> 0, -50 dBm -> 100)
    df["signal_score"] = np.clip((df["signal_strength"] - (-90.0)) / (-50.0 - (-90.0)) * 100.0, 0.0, 100.0)
    
    # 3. Latency Score (Linear interpolation: 1500 ms -> 0, 100 ms -> 100)
    df["latency_score"] = np.clip((1500.0 - df["latency_ms"]) / (1500.0 - 100.0) * 100.0, 0.0, 100.0)
    
    # 4. Packet Loss Score (Linear interpolation: 10% loss -> 0, 0% loss -> 100)
    df["packet_loss_score"] = np.clip((10.0 - df["packet_loss_rate"]) / (10.0 - 0.0) * 100.0, 0.0, 100.0)
    
    # 5. Weighted final score
    df["network_health_score"] = np.clip(
        0.35 * df["battery_score"] +
        0.25 * df["signal_score"] +
        0.20 * df["latency_score"] +
        0.20 * df["packet_loss_score"],
        0.0, 100.0
    )
    
    # 6. Categorize status labels
    def get_status(score):
        if score >= 90.0:
            return "EXCELLENT"
        elif score >= 75.0:
            return "GOOD"
        elif score >= 60.0:
            return "WARNING"
        elif score >= 40.0:
            return "CRITICAL"
        else:
            return "FAILING"
            
    df["network_health_status"] = df["network_health_score"].apply(get_status)
    return df

def generate_nhi_plots(df):
    """Generates the three requested NHI diagnostics charts."""
    os.makedirs(PLOTS_DIR, exist_ok=True)
    
    # 1. Network Health Distribution Plot
    plt.figure(figsize=(8, 5))
    n, bins, patches = plt.hist(df["network_health_score"], bins=20, color='royalblue', edgecolor='black', alpha=0.85, zorder=3)
    
    # Color background zones based on threshold categories
    plt.axvspan(0, 40, color='red', alpha=0.1, label="FAILING (0-39)")
    plt.axvspan(40, 60, color='orange', alpha=0.1, label="CRITICAL (40-59)")
    plt.axvspan(60, 75, color='yellow', alpha=0.15, label="WARNING (60-74)")
    plt.axvspan(75, 90, color='lightblue', alpha=0.1, label="GOOD (75-89)")
    plt.axvspan(90, 100, color='green', alpha=0.1, label="EXCELLENT (90-100)")
    
    plt.title("Network Health Index (NHI) Overall Distribution", fontsize=12, fontweight='bold')
    plt.xlabel("Health Index Score (0-100)", fontsize=10)
    plt.ylabel("Frequency (Counts)", fontsize=10)
    plt.xlim(0, 100)
    plt.grid(True, linestyle='--', alpha=0.5, zorder=0)
    plt.legend(loc="upper left", fontsize=8)
    
    dist_path = os.path.join(PLOTS_DIR, "network_health_distribution.png")
    plt.savefig(dist_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Distribution chart saved: {dist_path}")
    
    # 2. Network Health Trend Plot
    plt.figure(figsize=(10, 5))
    df_sorted = df.sort_values(by="unix_ts")
    
    # Group and plot each city node trend with simple moving average
    colors = ['royalblue', 'orange', 'forestgreen', 'darkviolet', 'crimson']
    cities = df_sorted["node_id"].unique()
    
    for i, city in enumerate(cities):
        city_df = df_sorted[df_sorted["node_id"] == city].reset_index(drop=True)
        # 10-point rolling mean to filter latency noise
        rolling_health = city_df["network_health_score"].rolling(window=10, min_periods=1).mean()
        
        plt.plot(city_df.index, city_df["network_health_score"], color=colors[i % len(colors)], alpha=0.15)
        plt.plot(city_df.index, rolling_health, color=colors[i % len(colors)], label=f"{city} (10-pt SMA)", lw=2)
        
    plt.title("WSN Network Health Trend over Observations Timeline", fontsize=12, fontweight='bold')
    plt.xlabel("Chronological Sequence Index per Node", fontsize=10)
    plt.ylabel("Network Health Score", fontsize=10)
    plt.ylim(0, 105)
    plt.grid(True, linestyle='--', alpha=0.5)
    plt.legend(loc="lower left", fontsize=8)
    
    trend_path = os.path.join(PLOTS_DIR, "network_health_trend.png")
    plt.savefig(trend_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Trend chart saved: {trend_path}")
    
    # 3. Component Contribution per Node
    plt.figure(figsize=(9, 5))
    node_means = df.groupby("node_id")[["battery_score", "signal_score", "latency_score", "packet_loss_score"]].mean()
    
    x = np.arange(len(node_means))
    width = 0.18
    
    plt.bar(x - 1.5*width, node_means["battery_score"], width, label="Battery Score (35%)", color='orange', edgecolor='black')
    plt.bar(x - 0.5*width, node_means["signal_score"], width, label="Signal Score (25%)", color='royalblue', edgecolor='black')
    plt.bar(x + 0.5*width, node_means["latency_score"], width, label="Latency Score (20%)", color='violet', edgecolor='black')
    plt.bar(x + 1.5*width, node_means["packet_loss_score"], width, label="Packet Loss Score (20%)", color='salmon', edgecolor='black')
    
    plt.title("Average Health Components Score contribution by Node Location", fontsize=12, fontweight='bold')
    plt.xlabel("City Node Location", fontsize=10)
    plt.ylabel("Component Score (0-100)", fontsize=10)
    plt.xticks(x, node_means.index, fontsize=9)
    plt.ylim(0, 110)
    plt.grid(True, linestyle='--', alpha=0.5)
    plt.legend(loc="upper right", fontsize=8)
    
    comp_path = os.path.join(PLOTS_DIR, "network_health_components.png")
    plt.savefig(comp_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Components chart saved: {comp_path}")

def generate_health_report(df):
    """Generates the NHI details summary report."""
    os.makedirs(REPORTS_DIR, exist_ok=True)
    os.makedirs(PREDICTIONS_DIR, exist_ok=True)
    
    report_content = []
    report_content.append("====================================================================\n")
    report_content.append("          WSN DETERMINISTIC NETWORK HEALTH INDEX (NHI) REPORT       \n")
    report_content.append("====================================================================\n\n")
    
    report_content.append("1. DEFINITIONS AND FORMULATION\n")
    report_content.append("------------------------------\n")
    report_content.append("The Network Health Index (NHI) is an explainable engineering metric scoring WSN operational\n")
    report_content.append("performance between 0 (complete failure) and 100 (optimal health). It is computed\n")
    report_content.append("by normalizing four distinct metrics and applying operational weights:\n\n")
    report_content.append("  * Battery Score (35% Weight):\n")
    report_content.append("    - Formula: battery_score = battery_level\n")
    report_content.append("    - Range: 0 to 100%\n\n")
    report_content.append("  * Signal Score (25% Weight):\n")
    report_content.append("    - Formula: signal_score = (signal_strength + 90.0) / 40.0 * 100.0\n")
    report_content.append("    - Range: RSSI >= -50 dBm maps to 100; RSSI <= -90 dBm maps to 0\n\n")
    report_content.append("  * Latency Score (20% Weight):\n")
    report_content.append("    - Formula: latency_score = (1500.0 - latency_ms) / 1400.0 * 100.0\n")
    report_content.append("    - Range: latency <= 100 ms maps to 100; latency >= 1500 ms maps to 0\n\n")
    report_content.append("  * Packet Loss Score (20% Weight):\n")
    report_content.append("    - Formula: packet_loss_score = (10.0 - packet_loss_rate) * 10.0\n")
    report_content.append("    - Range: packet_loss_rate = 0% maps to 100; packet_loss_rate >= 10% maps to 0\n\n")
    report_content.append("  * Combined Weighted Equation:\n")
    report_content.append("    nhi_score = 0.35*battery_score + 0.25*signal_score + 0.20*latency_score + 0.20*packet_loss_score\n")
    report_content.append("    (All subscores and final NHI score are clamped strictly to [0.0, 100.0])\n\n")
    
    report_content.append("2. HEALTH STATUS CLASSIFICATIONS\n")
    report_content.append("--------------------------------\n")
    report_content.append("The final NHI score classifies nodes into five distinct categories for maintenance dashboard feeds:\n")
    report_content.append("  * 90.0 - 100.0 ➔ EXCELLENT\n")
    report_content.append("  * 75.0 - 89.9  ➔ GOOD\n")
    report_content.append("  * 60.0 - 74.9  ➔ WARNING\n")
    report_content.append("  * 40.0 - 59.9  ➔ CRITICAL\n")
    report_content.append("  * 0.0  - 39.9  ➔ FAILING\n\n")
    
    report_content.append("3. DATASET STATISTICS SUMMARY\n")
    report_content.append("-----------------------------\n")
    report_content.append(f"Total rows calculated: {len(df)}\n")
    avg_nhi = df["network_health_score"].mean()
    min_nhi = df["network_health_score"].min()
    max_nhi = df["network_health_score"].max()
    report_content.append(f"  * Average WSN Health Index : {avg_nhi:.2f}\n")
    report_content.append(f"  * Minimum Logged Health    : {min_nhi:.2f}\n")
    report_content.append(f"  * Maximum Logged Health    : {max_nhi:.2f}\n\n")
    
    status_counts = df["network_health_status"].value_counts()
    report_content.append("Distribution of statuses across all nodes observations:\n")
    for status, count in status_counts.items():
        pct = count / len(df) * 100
        report_content.append(f"  * {status:<15}: {count:<5} records ({pct:.2f}%)\n")
    report_content.append("\n")
    
    report_content.append("4. EXEMPLAR CALCULATIONS\n")
    report_content.append("------------------------\n")
    # Take a couple rows from the dataframe to print as examples
    examples = df.head(2)
    for idx, row in examples.iterrows():
        report_content.append(f"Example Row {idx+1} (City: {row['node_id']}):\n")
        report_content.append(f"  - Input Attributes: Battery={row['battery_level']}%, RSSI={row['signal_strength']}dBm, Latency={row['latency_ms']}ms, Loss={row['packet_loss_rate']}%\n")
        report_content.append(f"  - Subscores       : Battery_Score={row['battery_score']:.2f}, Signal_Score={row['signal_score']:.2f}, Latency_Score={row['latency_score']:.2f}, Loss_Score={row['packet_loss_score']:.2f}\n")
        report_content.append(f"  - Weighted Score  : {row['network_health_score']:.2f}\n")
        report_content.append(f"  - Status Category : {row['network_health_status']}\n\n")
        
    report_content.append("5. CONCLUSION\n")
    report_content.append("-------------\n")
    report_content.append("This deterministic engineering NHI replacement provides clear, explainable, and reproducible tracking\n")
    report_content.append("of sensor nodes compared to previous ML approximations. The generated values are persisted in the\n")
    report_content.append("database logs and fully integrated with dashboard analytics metrics.\n")
    
    report_txt = "".join(report_content)
    
    # Save to reports/
    with open(os.path.join(REPORTS_DIR, "network_health_report.txt"), "w", encoding="utf-8") as f:
        f.write(report_txt)
    # Save to data/predictions/
    with open(os.path.join(PREDICTIONS_DIR, "network_health_report.txt"), "w", encoding="utf-8") as f:
        f.write(report_txt)
        
    print(f"Network health diagnostic report saved to /reports/ and /predictions/network_predictions/.")

def main():
    if not os.path.exists(DATASET_PATH):
        print(f"Processed dataset not found at: {DATASET_PATH}")
        return
        
    df = pd.read_csv(DATASET_PATH)
    print("Calculating Network Health Index components...")
    df = calculate_nhi_components(df)
    
    # Save back to processed database
    df.to_csv(DATASET_PATH, index=False)
    print("Saved updated columns to wsn_dataset.csv.")
    
    # Generate charts
    generate_nhi_plots(df)
    
    # Generate report
    generate_health_report(df)
    print("Network health index calculations complete!")

if __name__ == "__main__":
    main()
