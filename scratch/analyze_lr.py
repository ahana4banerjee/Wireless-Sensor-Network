import os
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score

DATASET_PATH = "data/processed/wsn_dataset.csv"
if not os.path.exists(DATASET_PATH):
    print("Dataset not found!")
    exit(1)

df = pd.read_csv(DATASET_PATH)
dt_series = pd.to_datetime(df['unix_ts'], unit='s')
df['hour'] = dt_series.dt.hour
df['day'] = dt_series.dt.day
df['month'] = dt_series.dt.month

df = df.dropna(subset=["temp", "humidity", "pressure", "wind_speed", "unix_ts"])

# Features
features_with_ts = ["unix_ts", "pressure", "wind_speed", "temp", "hour", "day", "month"]
features_no_ts = ["pressure", "wind_speed", "temp", "hour", "day", "month"]

X_with = df[features_with_ts]
X_no = df[features_no_ts]
y = df["humidity"]

X_tr_w, X_te_w, y_tr_w, y_te_w = train_test_split(X_with, y, test_size=0.2, random_state=42, shuffle=True)
X_tr_n, X_te_n, y_tr_n, y_te_n = train_test_split(X_no, y, test_size=0.2, random_state=42, shuffle=True)

model_w = LinearRegression()
model_w.fit(X_tr_w, y_tr_w)
preds_w = model_w.predict(X_te_w)

model_n = LinearRegression()
model_n.fit(X_tr_n, y_tr_n)
preds_n = model_n.predict(X_te_n)

print("With unix_ts:")
print("Coefficients:")
for f, coef in zip(features_with_ts, model_w.coef_):
    print(f"  {f}: {coef}")
print(f"Intercept: {model_w.intercept_}")
print(f"R2 score: {r2_score(y_te_w, preds_w)}")
print(f"Predictions std dev: {np.std(preds_w)}")
print(f"Predictions range: {np.min(preds_w)} to {np.max(preds_w)}")

print("\nWithout unix_ts:")
print("Coefficients:")
for f, coef in zip(features_no_ts, model_n.coef_):
    print(f"  {f}: {coef}")
print(f"Intercept: {model_n.intercept_}")
print(f"R2 score: {r2_score(y_te_n, preds_n)}")
print(f"Predictions std dev: {np.std(preds_n)}")
print(f"Predictions range: {np.min(preds_n)} to {np.max(preds_n)}")
