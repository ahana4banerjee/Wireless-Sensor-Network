import React, { useEffect, useState } from 'react';
import { wsnApi } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BrainCircuit, Info, Thermometer, Droplets } from 'lucide-react';

export default function Predictions() {
  const [tempPreds, setTempPreds] = useState([]);
  const [humidityPreds, setHumidityPreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartMode, setChartMode] = useState('temp'); // 'temp' or 'humidity'

  useEffect(() => {
    async function fetchPredictions() {
      try {
        setLoading(true);
        const [tempRes, humidityRes] = await Promise.all([
          wsnApi.getTempPredictions(100), // Load last 100 predictions for charts
          wsnApi.getHumidityPredictions(100)
        ]);
        
        // Sort chronologically ascending for the chart rendering logic
        const sortedTemp = [...tempRes].sort((a, b) => a.unix_ts - b.unix_ts);
        const sortedHum = [...humidityRes].sort((a, b) => a.unix_ts - b.unix_ts);
        
        setTempPreds(sortedTemp);
        setHumidityPreds(sortedHum);
        setError(null);
      } catch (err) {
        console.error("Failed to load predictions:", err);
        setError("Predictions files not found or FastAPI server is unreachable.");
      } finally {
        setLoading(false);
      }
    }
    fetchPredictions();
  }, []);

  if (loading) {
    return <div className="text-slate-400 py-10 text-sm">Loading Linear Regression model predictions...</div>;
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-5 rounded-2xl max-w-xl">
        <h4 className="font-bold text-base m-0 flex items-center gap-2"><Info className="w-5 h-5" /> Predictions Unavailable</h4>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-xs text-slate-500 mt-3 font-semibold">Make sure to execute the environmental predictor pipeline first.</p>
      </div>
    );
  }

  const activePreds = chartMode === 'temp' ? tempPreds : humidityPreds;
  const unit = chartMode === 'temp' ? "°C" : "%";
  const title = chartMode === 'temp' ? "Temperature Forecasting" : "Humidity Forecasting";

  // Calculate prediction error stats
  const calculateStats = (data) => {
    if (!data || data.length === 0) return { mae: 0, rmse: 0 };
    let absErrorSum = 0;
    let sqErrorSum = 0;
    data.forEach(p => {
      const err = Math.abs(p.actual - p.predicted);
      absErrorSum += err;
      sqErrorSum += err * err;
    });
    return {
      mae: (absErrorSum / data.length).toFixed(3),
      rmse: Math.sqrt(sqErrorSum / data.length).toFixed(3)
    };
  };

  const tempStats = calculateStats(tempPreds);
  const humStats = calculateStats(humidityPreds);

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header title */}
      <div>
        <h2 className="text-2xl font-bold text-white m-0">Model Predictions</h2>
        <p className="text-slate-400 text-sm mt-1">Comparisons between actual conditions and values forecasted by the Linear Regression models.</p>
      </div>

      {/* Target Predictor Model Switcher & Stats */}
      <div className="flex flex-col md:flex-row gap-6 items-stretch justify-between">
        {/* Toggle button Group */}
        <div className="bg-slate-950 p-1 rounded-2xl border border-slate-900 flex self-start gap-1">
          <button
            onClick={() => setChartMode('temp')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              chartMode === 'temp' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Thermometer className="w-4 h-4" /> Temperature Predictions
          </button>
          <button
            onClick={() => setChartMode('humidity')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              chartMode === 'humidity' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Droplets className="w-4 h-4" /> Humidity Predictions
          </button>
        </div>

        {/* Prediction Accuracy Summary Card */}
        <div className="glass-card px-6 py-4 flex items-center gap-8 self-stretch">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-600/15 border border-violet-500/25 rounded-xl">
              <BrainCircuit className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-bold uppercase">Linear Regression</span>
              <span className="text-sm font-bold text-white">Evaluation Stats</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-900" />
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Temperature MAE</span>
              <span className="text-base font-bold text-violet-400">{tempStats.mae} °C</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Humidity MAE</span>
              <span className="text-base font-bold text-cyan-400">{humStats.mae} %</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Predictions Line Chart */}
      <div className="glass-card p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-200 m-0">{title} Tracking (Actual vs. Predicted)</h3>
          <span className="text-xs text-slate-500">First 100 sequential test observations</span>
        </div>
        
        <div className="h-96 w-full">
          {activePreds.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activePreds} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickFormatter={(t) => t ? t.split(' ')[3] : ''} // Show only the time component
                  tickLine={false}
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} label={{ value: unit, angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f3f4f6' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line 
                  name={`Actual ${chartMode === 'temp' ? 'Temp' : 'Humidity'}`} 
                  type="monotone" 
                  dataKey="actual" 
                  stroke={chartMode === 'temp' ? '#8b5cf6' : '#06b6d4'} 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line 
                  name={`Predicted ${chartMode === 'temp' ? 'Temp' : 'Humidity'}`} 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">No predictions recorded.</div>
          )}
        </div>
      </div>

      {/* Predictions Dataset table */}
      <div className="glass-card p-6 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-200 m-0">Recent Predictions Analysis Table</h3>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-900 text-slate-400 text-xs uppercase tracking-wider font-semibold sticky top-0 bg-slate-950/90 py-2.5 z-10">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Unix TS</th>
                <th className="py-2.5 px-4">Actual Value ({unit})</th>
                <th className="py-2.5 px-4">Predicted Value ({unit})</th>
                <th className="py-2.5 px-4">Prediction Error / Residual</th>
                <th className="py-2.5 px-4">Fit Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {activePreds.map((row, idx) => {
                const errorVal = row.actual - row.predicted;
                const absErr = Math.abs(errorVal);
                
                // Fit rating classes
                let ratingText = "Perfect";
                let ratingClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
                
                if (chartMode === 'temp') {
                  if (absErr > 2.0) {
                    ratingText = "Low Fit";
                    ratingClass = "bg-rose-500/10 text-rose-400 border-rose-500/25";
                  } else if (absErr > 0.8) {
                    ratingText = "Moderate Fit";
                    ratingClass = "bg-amber-500/10 text-amber-400 border-amber-500/25";
                  }
                } else {
                  if (absErr > 12.0) {
                    ratingText = "Low Fit";
                    ratingClass = "bg-rose-500/10 text-rose-400 border-rose-500/25";
                  } else if (absErr > 5.0) {
                    ratingText = "Moderate Fit";
                    ratingClass = "bg-amber-500/10 text-amber-400 border-amber-500/25";
                  }
                }
                
                return (
                  <tr key={idx} className="hover:bg-slate-900/40 transition-colors duration-150">
                    <td className="py-3 px-4 text-xs text-slate-500 font-medium">{row.timestamp}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{row.unix_ts}</td>
                    <td className="py-3 px-4 font-bold text-white">{row.actual.toFixed(2)}</td>
                    <td className="py-3 px-4 text-violet-400 font-semibold">{row.predicted.toFixed(2)}</td>
                    <td className={`py-3 px-4 font-mono font-medium ${errorVal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {errorVal >= 0 ? '+' : ''}{errorVal.toFixed(4)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${ratingClass}`}>
                        {ratingText}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {activePreds.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">No prediction data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
