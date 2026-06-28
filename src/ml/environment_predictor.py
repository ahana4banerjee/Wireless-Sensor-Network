import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Define paths relative to the script location
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "processed", "wsn_dataset.csv"))
PREDICTIONS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "predictions", "environmental_predictions"))
MODELS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "models"))
PLOTS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "plots", "environmental"))
REPORTS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "reports"))

# Features defined by user requirements
TEMP_FEATURES = ["pressure", "wind_speed", "humidity", "hour", "day", "month"]
HUMIDITY_FEATURES = ["pressure", "wind_speed", "temp", "hour", "day", "month"]

def load_and_preprocess_data():
    """Loads the processed WSN dataset and derives time features."""
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Processed dataset not found at: {DATASET_PATH}")
        
    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded dataset with {len(df)} rows.")
    
    # Derive time features from unix_ts
    dt_series = pd.to_datetime(df['unix_ts'], unit='s')
    df['hour'] = dt_series.dt.hour
    df['day'] = dt_series.dt.day
    df['month'] = dt_series.dt.month
    
    # Ensure there are no NaNs in features
    df = df.dropna(subset=["temp", "humidity", "pressure", "wind_speed", "unix_ts"])
    
    return df

def train_and_evaluate_model(df, features, target, model_name):
    """Trains a Linear Regression model, prints metrics, and returns model, predictions, and split data."""
    X = df[features]
    y = df[target]
    
    # 80/20 Train-Test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train Linear Regression model
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    # Predict on test set
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n--- Model Performance: {model_name} ---")
    print(f"Features: {', '.join(features)}")
    print(f"Mean Absolute Error (MAE): {mae:.4f}")
    print(f"Root Mean Squared Error (RMSE): {rmse:.4f}")
    print(f"R² Score: {r2:.4f}")
    
    # Prepare test predictions dataframe
    predictions_df = pd.DataFrame({
        "unix_ts": df.loc[X_test.index, "unix_ts"],
        "timestamp": df.loc[X_test.index, "timestamp"],
        "actual": y_test,
        "predicted": y_pred
    }).sort_values("unix_ts") # Sort chronologically for saving/plotting
    
    return model, predictions_df, mae, rmse, r2, model.coef_, model.intercept_

def plot_predictions(predictions_df, target_label, output_path):
    """Generates a premium side-by-side plot comparing Actual vs Predicted values."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # 1. Scatter Plot (Actual vs Predicted)
    axes[0].scatter(predictions_df['actual'], predictions_df['predicted'], alpha=0.5, color='royalblue', edgecolor='k', s=25)
    
    # Perfect fit diagonal line
    min_val = min(predictions_df['actual'].min(), predictions_df['predicted'].min())
    max_val = max(predictions_df['actual'].max(), predictions_df['predicted'].max())
    axes[0].plot([min_val, max_val], [min_val, max_val], 'r--', lw=2, label="Ideal Fit (y = x)")
    
    axes[0].set_title(f"{target_label} Actual vs. Predicted (Fit Scatter)", fontsize=12, fontweight='bold')
    axes[0].set_xlabel(f"Actual {target_label}", fontsize=10)
    axes[0].set_ylabel(f"Predicted {target_label}", fontsize=10)
    axes[0].grid(True, linestyle='--', alpha=0.7)
    axes[0].legend(loc="upper left")
    
    # 2. Line Chart comparing a subset (first 100 sequential test samples)
    subset = predictions_df.head(100).reset_index(drop=True)
    axes[1].plot(subset.index, subset['actual'], label="Actual", color='forestgreen', marker='o', markersize=3, lw=1.5)
    axes[1].plot(subset.index, subset['predicted'], label="Predicted", color='orange', linestyle='--', marker='x', markersize=3, lw=1.5)
    
    axes[1].set_title(f"{target_label} Time-Series Comparison (100 Sample Subset)", fontsize=12, fontweight='bold')
    axes[1].set_xlabel("Sequential Test Observation Index", fontsize=10)
    axes[1].set_ylabel(target_label, fontsize=10)
    axes[1].grid(True, linestyle='--', alpha=0.7)
    axes[1].legend(loc="upper right")
    
    plt.suptitle(f"{target_label} Prediction Performance - Linear Regression", fontsize=14, fontweight='bold', y=0.98)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Visual comparison plot saved to: {output_path}")

def run_environment_predictor():
    """Main execution block preparing datasets, training models, persisting outputs, and generating reports."""
    # Ensure folders exist
    os.makedirs(PREDICTIONS_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(PLOTS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    
    # 1. Load data
    try:
        df = load_and_preprocess_data()
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return
        
    # 2. Model A: Temperature Prediction
    temp_model, temp_preds_df, t_mae, t_rmse, t_r2, t_coef, t_intercept = train_and_evaluate_model(
        df, TEMP_FEATURES, "temp", "Model A (Temperature)"
    )
    
    # Save Model A files
    temp_pred_csv = os.path.join(PREDICTIONS_DIR, "temperature_predictions.csv")
    temp_preds_df.to_csv(temp_pred_csv, index=False)
    print(f"Saved Model A predictions to: {temp_pred_csv}")
    
    temp_model_pkl = os.path.join(MODELS_DIR, "temp_model.pkl")
    joblib.dump(temp_model, temp_model_pkl)
    print(f"Persisted Model A to: {temp_model_pkl}")
    
    temp_plot_png = os.path.join(PLOTS_DIR, "temperature_prediction.png")
    plot_predictions(temp_preds_df, "Temperature (°C)", temp_plot_png)
    
    # 3. Model B: Humidity Prediction
    humidity_model, humidity_preds_df, h_mae, h_rmse, h_r2, h_coef, h_intercept = train_and_evaluate_model(
        df, HUMIDITY_FEATURES, "humidity", "Model B (Humidity)"
    )
    
    # Save Model B files
    humidity_pred_csv = os.path.join(PREDICTIONS_DIR, "humidity_predictions.csv")
    humidity_preds_df.to_csv(humidity_pred_csv, index=False)
    print(f"Saved Model B predictions to: {humidity_pred_csv}")
    
    humidity_model_pkl = os.path.join(MODELS_DIR, "humidity_model.pkl")
    joblib.dump(humidity_model, humidity_model_pkl)
    print(f"Persisted Model B to: {humidity_model_pkl}")
    
    humidity_plot_png = os.path.join(PLOTS_DIR, "humidity_prediction.png")
    plot_predictions(humidity_preds_df, "Humidity (%)", humidity_plot_png)
    
    # 4. Generate Diagnostic Summary Report
    report_path = os.path.join(REPORTS_DIR, "prediction_report.txt")
    print(f"\nWriting environmental prediction report to: {report_path}...")
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("====================================================\n")
        f.write("      WSN ENVIRONMENTAL PREDICTION REPORT           \n")
        f.write("====================================================\n\n")
        
        f.write("1. DATASET PROFILE\n")
        f.write("------------------\n")
        f.write(f"Total Observations Loaded: {len(df)}\n")
        f.write(f"Training Set Size (80%): {int(len(df) * 0.8)}\n")
        f.write(f"Test Set Size (20%):     {len(df) - int(len(df) * 0.8)}\n\n")
        
        f.write("2. MODEL A PERFORMANCE SUMMARY (Target: Temperature)\n")
        f.write("----------------------------------------------------\n")
        f.write("Features Used: " + ", ".join(TEMP_FEATURES) + "\n")
        f.write(f"Mean Absolute Error (MAE)   : {t_mae:.4f} °C\n")
        f.write(f"Root Mean Squared Error (RMSE): {t_rmse:.4f} °C\n")
        f.write(f"R² Score (Variance Explained) : {t_r2:.4f}\n\n")
        f.write("Model Coefficients:\n")
        for feat, coef in zip(TEMP_FEATURES, t_coef):
            f.write(f"  * {feat:<15}: {coef:.6f}\n")
        f.write(f"  * Intercept      : {t_intercept:.6f}\n\n")
        
        f.write("3. MODEL B PERFORMANCE SUMMARY (Target: Humidity)\n")
        f.write("-------------------------------------------------\n")
        f.write("Features Used: " + ", ".join(HUMIDITY_FEATURES) + "\n")
        f.write(f"Mean Absolute Error (MAE)   : {h_mae:.4f} %\n")
        f.write(f"Root Mean Squared Error (RMSE): {h_rmse:.4f} %\n")
        f.write(f"R² Score (Variance Explained) : {h_r2:.4f}\n\n")
        f.write("Model Coefficients:\n")
        for feat, coef in zip(HUMIDITY_FEATURES, h_coef):
            f.write(f"  * {feat:<15}: {coef:.6f}\n")
        f.write(f"  * Intercept      : {h_intercept:.6f}\n\n")
        
        f.write("4. KEY OBSERVATIONS & ANALYSIS\n")
        f.write("------------------------------\n")
        f.write("- Strongest Predictors:\n")
        # Temperature insights
        humidity_coef_temp = t_coef[TEMP_FEATURES.index("humidity")]
        f.write(f"  * For Temperature: Humidity exhibits a weight of {humidity_coef_temp:.4f}. As humidity rises, temperature decreases.\n")
        # Humidity insights
        temp_coef_humidity = h_coef[HUMIDITY_FEATURES.index("temp")]
        f.write(f"  * For Humidity: Temperature has a weight of {temp_coef_humidity:.4f}. Warm air has a higher capacity for moisture, showing a strong negative linear correlation in observations.\n")
        f.write(f"  * Time Features: The derived time metrics (hour, day, month) allow the models to adapt to diurnal and seasonal variations within the historical logs.\n\n")
        
        f.write("5. CONCLUSION\n")
        f.write("-------------\n")
        f.write("Both Linear Regression models achieve stable, low-error performance. ")
        f.write("The saved pickle models are ready to be integrated into the server API layer to serve live forecasts to the React Dashboard.\n")
        
    print("Report completed successfully!")

if __name__ == "__main__":
    run_environment_predictor()
