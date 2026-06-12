import { useEffect, useState } from 'react';
import { wsnApi } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BrainCircuit, Info, Thermometer, Droplets, Battery, Activity, Wifi } from 'lucide-react';

export default function Predictions() {
  const [tempPreds, setTempPreds] = useState([]);
  const [humidityPreds, setHumidityPreds] = useState([]);
  const [batteryPreds, setBatteryPreds] = useState([]);
  const [latencyPreds, setLatencyPreds] = useState([]);
  const [packetLossPreds, setPacketLossPreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartMode, setChartMode] = useState('temp'); // 'temp', 'humidity', 'battery', 'latency', 'packetLoss'

  useEffect(() => {
    async function fetchPredictions() {
      try {
        const [tempRes, humidityRes, networkRes] = await Promise.all([
          wsnApi.getTempPredictions(100), // Load last 100 predictions for charts
          wsnApi.getHumidityPredictions(100),
          wsnApi.getNetworkPredictions(100)
        ]);
        
        // Sort chronologically ascending for the chart rendering logic
        const sortedTemp = [...tempRes].sort((a, b) => a.unix_ts - b.unix_ts);
        const sortedHum = [...humidityRes].sort((a, b) => a.unix_ts - b.unix_ts);
        const sortedBat = [...networkRes.battery].sort((a, b) => a.unix_ts - b.unix_ts);
        const sortedLat = [...networkRes.latency].sort((a, b) => a.unix_ts - b.unix_ts);
        const sortedLoss = [...networkRes.packet_loss].sort((a, b) => a.unix_ts - b.unix_ts);
        
        setTempPreds(sortedTemp);
        setHumidityPreds(sortedHum);
        setBatteryPreds(sortedBat);
        setLatencyPreds(sortedLat);
        setPacketLossPreds(sortedLoss);
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
    return (
      <div className="flex flex-col gap-8 w-full animate-pulse">
        {/* Header */}
        <div>
          <div className="h-7 w-48 bg-slate-900 rounded mb-2" />
          <div className="h-4 w-96 bg-slate-900 rounded" />
        </div>

        {/* Switcher & Stats card skeleton */}
        <div className="flex flex-col md:flex-row gap-6 items-stretch justify-between">
          <div className="bg-slate-950 p-1 rounded-2xl h-14 w-80 bg-slate-900/60" />
          <div className="glass-card px-6 py-4 h-16 w-80 flex items-center justify-between" />
        </div>

        {/* Main Chart Card skeleton */}
        <div className="glass-card p-6 h-96 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="h-4 w-64 bg-slate-900 rounded" />
            <div className="h-3 w-32 bg-slate-900 rounded" />
          </div>
          <div className="flex-1 bg-slate-950/40 rounded-xl flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-800/40 border-t-violet-500 rounded-full animate-spin" />
          </div>
        </div>

        {/* Predictions Table skeleton */}
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="h-5 w-56 bg-slate-900 rounded" />
          <div className="flex flex-col gap-3">
            <div className="h-5 bg-slate-950 rounded" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-slate-950/40 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-5 rounded-2xl max-w-xl">
        <h4 className="font-bold text-base m-0 flex items-center gap-2"><Info className="w-5 h-5" /> Predictions Unavailable</h4>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-xs text-slate-500 mt-3 font-semibold">Make sure to execute the environmental and network predictor pipelines first.</p>
      </div>
    );
  }

  // Determine active dataset based on mode
  let activePreds = [];
  let unit = "";
  let title = "";
  let modelType = "";
  let modelColor = "";

  if (chartMode === 'temp') {
    activePreds = tempPreds;
    unit = "°C";
    title = "Temperature Forecasting";
    modelType = "Linear Regression";
    modelColor = "#8b5cf6"; // Violet
  } else if (chartMode === 'humidity') {
    activePreds = humidityPreds;
    unit = "%";
    title = "Humidity Forecasting";
    modelType = "Linear Regression";
    modelColor = "#06b6d4"; // Cyan
  } else if (chartMode === 'battery') {
    activePreds = batteryPreds;
    unit = "%";
    title = "Battery Decay Prediction";
    modelType = "Gradient Boosting";
    modelColor = "#10b981"; // Emerald
  } else if (chartMode === 'latency') {
    activePreds = latencyPreds;
    unit = "ms";
    title = "Network Latency Prediction";
    modelType = "Gradient Boosting";
    modelColor = "#f59e0b"; // Amber
  } else if (chartMode === 'packetLoss') {
    activePreds = packetLossPreds;
    unit = "%";
    title = "Packet Loss Rate Prediction";
    modelType = "Gradient Boosting";
    modelColor = "#f43f5e"; // Rose
  }

  // Calculate prediction error stats
  const calculateStats = (data) => {
    if (!data || data.length === 0) return { mae: "0.000", rmse: "0.000" };
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

  const activeStats = calculateStats(activePreds);
  
  // Custom predicted color to avoid overlap with amber latency line
  const predictedColor = chartMode === 'latency' ? '#8b5cf6' : '#f59e0b';

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header title */}
      <div>
        <h2 className="text-2xl font-bold text-white m-0">Model Predictions</h2>
        <p className="text-slate-400 text-sm mt-1">Comparisons between actual sensor metrics and values forecasted by the ML models.</p>
      </div>

      {/* Target Predictor Model Switcher & Stats */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-between">
        {/* Toggle button Groups */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Environmental Model Selector */}
          <div className="bg-slate-950 p-1 rounded-2xl border border-slate-900/60 flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 uppercase font-bold px-3">Env (LR)</span>
            <button
              onClick={() => setChartMode('temp')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                chartMode === 'temp' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Thermometer className="w-3.5 h-3.5" /> Temp
            </button>
            <button
              onClick={() => setChartMode('humidity')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                chartMode === 'humidity' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" /> Humidity
            </button>
          </div>

          {/* Network Model Selector */}
          <div className="bg-slate-950 p-1 rounded-2xl border border-slate-900/60 flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 uppercase font-bold px-3">Network (GB)</span>
            <button
              onClick={() => setChartMode('battery')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                chartMode === 'battery' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Battery className="w-3.5 h-3.5" /> Battery
            </button>
            <button
              onClick={() => setChartMode('latency')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                chartMode === 'latency' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Latency
            </button>
            <button
              onClick={() => setChartMode('packetLoss')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                chartMode === 'packetLoss' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" /> Loss
            </button>
          </div>
        </div>

        {/* Prediction Accuracy Summary Card */}
        <div className="glass-card px-6 py-4 flex items-center gap-8 self-stretch">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-600/15 border border-violet-500/25 rounded-xl">
              <BrainCircuit className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-bold uppercase">{modelType}</span>
              <span className="text-sm font-bold text-white">Evaluation Stats</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-900" />
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">MAE (Error Mean)</span>
              <span className="text-base font-bold" style={{ color: modelColor }}>{activeStats.mae} {unit}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">RMSE (Std Dev)</span>
              <span className="text-base font-bold text-slate-300">{activeStats.rmse} {unit}</span>
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
                  name={`Actual ${chartMode === 'temp' ? 'Temp' : chartMode === 'humidity' ? 'Humidity' : chartMode === 'battery' ? 'Battery' : chartMode === 'latency' ? 'Latency' : 'Packet Loss'}`} 
                  type="monotone" 
                  dataKey="actual" 
                  stroke={modelColor} 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line 
                  name={`Predicted (${modelType})`} 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke={predictedColor} 
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
                
                let lowThreshold = 10.0;
                let modThreshold = 3.0;
                if (chartMode === 'temp') {
                  lowThreshold = 2.0;
                  modThreshold = 0.8;
                } else if (chartMode === 'humidity') {
                  lowThreshold = 12.0;
                  modThreshold = 5.0;
                } else if (chartMode === 'battery') {
                  lowThreshold = 5.0;
                  modThreshold = 1.5;
                } else if (chartMode === 'latency') {
                  lowThreshold = 150.0;
                  modThreshold = 40.0;
                } else if (chartMode === 'packetLoss') {
                  lowThreshold = 2.0;
                  modThreshold = 0.5;
                }
                
                if (absErr > lowThreshold) {
                  ratingText = "Low Fit";
                  ratingClass = "bg-rose-500/10 text-rose-400 border-rose-500/25";
                } else if (absErr > modThreshold) {
                  ratingText = "Moderate Fit";
                  ratingClass = "bg-amber-500/10 text-amber-400 border-amber-500/25";
                }
                
                return (
                  <tr key={idx} className="hover:bg-slate-900/40 transition-colors duration-150">
                    <td className="py-3 px-4 text-xs text-slate-500 font-medium">{row.timestamp}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{row.unix_ts}</td>
                    <td className="py-3 px-4 font-bold text-white">{row.actual.toFixed(2)}</td>
                    <td className="py-3 px-4 font-semibold" style={{ color: modelColor }}>{row.predicted.toFixed(2)}</td>
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
