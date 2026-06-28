import { useEffect, useState } from 'react';
import { wsnApi } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  BrainCircuit, Info, Thermometer, Droplets, Battery, Activity, Wifi, 
  ShieldAlert, Wrench, AlertTriangle, Calendar, Hourglass, CheckCircle2, 
  BarChart3, RefreshCw, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { ChartSkeleton, TableSkeleton, ErrorCard } from '../ui/Skeletons';

export default function Predictions() {
  const [selectedNode, setSelectedNode] = useState('Bangalore');
  const [nodes, setNodes] = useState([]);
  const [forecastHorizon, setForecastHorizon] = useState(72); // 24, 48, 72
  const [forecastData, setForecastData] = useState({ data: null, loading: true, error: null });
  
  // Model performance (Legacy Actual vs Predicted evaluations)
  const [tempPreds, setTempPreds] = useState({ data: [], loading: true, error: null });
  const [humidityPreds, setHumidityPreds] = useState({ data: [], loading: true, error: null });
  const [networkPreds, setNetworkPreds] = useState({ data: null, loading: true, error: null });
  const [chartMode, setChartMode] = useState('temp'); // 'temp', 'humidity', 'battery', 'latency', 'packetLoss'
  const [showEvaluation, setShowEvaluation] = useState(false);

  // Fetch registered nodes list
  const fetchNodesList = async () => {
    try {
      const res = await wsnApi.getLiveData();
      const nodeNames = res.map(node => node.city);
      setNodes(nodeNames.length > 0 ? nodeNames : ['Bangalore', 'Hyderabad', 'Mumbai', 'Delhi', 'Secunderabad']);
      if (nodeNames.length > 0 && !nodeNames.includes(selectedNode)) {
        setSelectedNode(nodeNames[0]);
      }
    } catch (err) {
      setNodes(['Bangalore', 'Hyderabad', 'Mumbai', 'Delhi', 'Secunderabad']);
    }
  };

  // Fetch forecast data
  const fetchForecast = async () => {
    try {
      setForecastData(prev => ({ ...prev, loading: true, error: null }));
      const res = await wsnApi.getNodeForecast(selectedNode, forecastHorizon, 3);
      setForecastData({ data: res, loading: false, error: null });
    } catch (err) {
      setForecastData({ data: null, loading: false, error: err.message || `Failed to fetch forecast for ${selectedNode}.` });
    }
  };

  // Fetch model evaluations
  const fetchTempPreds = async () => {
    try {
      setTempPreds(prev => ({ ...prev, loading: prev.data.length === 0, error: null }));
      const res = await wsnApi.getTempPredictions(100);
      const sorted = [...res].sort((a, b) => a.unix_ts - b.unix_ts);
      setTempPreds({ data: sorted, loading: false, error: null });
    } catch (err) {
      setTempPreds(prev => ({ ...prev, loading: false, error: err.message || "Failed to load temperature predictions." }));
    }
  };

  const fetchHumidityPreds = async () => {
    try {
      setHumidityPreds(prev => ({ ...prev, loading: prev.data.length === 0, error: null }));
      const res = await wsnApi.getHumidityPredictions(100);
      const sorted = [...res].sort((a, b) => a.unix_ts - b.unix_ts);
      setHumidityPreds({ data: sorted, loading: false, error: null });
    } catch (err) {
      setHumidityPreds(prev => ({ ...prev, loading: false, error: err.message || "Failed to load humidity predictions." }));
    }
  };

  const fetchNetworkPreds = async () => {
    try {
      setNetworkPreds(prev => ({ ...prev, loading: prev.data === null, error: null }));
      const res = await wsnApi.getNetworkPredictions(100);
      setNetworkPreds({ data: res, loading: false, error: null });
    } catch (err) {
      setNetworkPreds(prev => ({ ...prev, loading: false, error: err.message || "Failed to load network predictions." }));
    }
  };

  const loadAll = () => {
    fetchNodesList();
    fetchTempPreds();
    fetchHumidityPreds();
    fetchNetworkPreds();
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [selectedNode, forecastHorizon]);

  // Model validation evaluation stats helper
  let activeEvalData = [];
  let isEvalLoading = false;
  let evalUnit = "";
  let evalTitle = "";
  let modelColor = "";
  let modelType = "Linear Regression";

  if (chartMode === 'temp') {
    activeEvalData = tempPreds.data;
    isEvalLoading = tempPreds.loading;
    evalUnit = "°C";
    evalTitle = "Temperature ML Evaluation";
    modelColor = "#8b5cf6";
  } else if (chartMode === 'humidity') {
    activeEvalData = humidityPreds.data;
    isEvalLoading = humidityPreds.loading;
    evalUnit = "%";
    evalTitle = "Humidity ML Evaluation";
    modelColor = "#06b6d4";
  } else if (chartMode === 'battery') {
    activeEvalData = networkPreds.data?.battery ? [...networkPreds.data.battery].sort((a, b) => a.unix_ts - b.unix_ts) : [];
    isEvalLoading = networkPreds.loading;
    evalUnit = "%";
    evalTitle = "Battery ML Evaluation";
    modelColor = "#10b981";
  } else if (chartMode === 'latency') {
    activeEvalData = networkPreds.data?.latency ? [...networkPreds.data.latency].sort((a, b) => a.unix_ts - b.unix_ts) : [];
    isEvalLoading = networkPreds.loading;
    evalUnit = "ms";
    evalTitle = "Latency ML Evaluation";
    modelColor = "#f59e0b";
  } else if (chartMode === 'packetLoss') {
    activeEvalData = networkPreds.data?.packet_loss ? [...networkPreds.data.packet_loss].sort((a, b) => a.unix_ts - b.unix_ts) : [];
    isEvalLoading = networkPreds.loading;
    evalUnit = "%";
    evalTitle = "Packet Loss ML Evaluation";
    modelColor = "#f43f5e";
  }

  const calculateStats = (data) => {
    if (!data || data.length === 0) return { mae: "0.000", rmse: "0.000", r2: "0.000" };
    let absErrorSum = 0;
    let sqErrorSum = 0;
    let actualSum = 0;
    data.forEach(p => {
      const err = Math.abs(p.actual - p.predicted);
      absErrorSum += err;
      sqErrorSum += err * err;
      actualSum += p.actual;
    });
    const mean = actualSum / data.length;
    let totalVar = 0;
    data.forEach(p => {
      totalVar += (p.actual - mean) * (p.actual - mean);
    });
    const r2 = totalVar > 0 ? (1 - sqErrorSum / totalVar) : 0.0;
    return {
      mae: (absErrorSum / data.length).toFixed(3),
      rmse: Math.sqrt(sqErrorSum / data.length).toFixed(3),
      r2: r2.toFixed(3)
    };
  };

  const activeStats = calculateStats(activeEvalData);

  // Operational decision support color helpers
  const getRiskBadgeClass = (risk) => {
    switch (risk) {
      case 'CRITICAL': return 'bg-rose-500/10 text-rose-400 border border-rose-500/25';
      case 'HIGH': return 'bg-orange-500/10 text-orange-400 border border-orange-500/25';
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25';
      case 'LOW': return 'bg-sky-500/10 text-sky-400 border border-sky-500/25';
      default: return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
    }
  };

  const getInsightSeverityIcon = (sev) => {
    switch (sev) {
      case 'CRITICAL': return <AlertCircle className="w-5 h-5 text-rose-400" />;
      case 'HIGH': return <ShieldAlert className="w-5 h-5 text-orange-400" />;
      case 'MEDIUM': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <Info className="w-5 h-5 text-sky-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full text-slate-200">
      
      {/* Header with Selector Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white m-0">Operations Decision Support</h2>
          <p className="text-slate-400 text-sm mt-1">Evolving machine learning predictions into proactive maintenance forecasting and operational risk classification.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Node Filter */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-900">
            <span className="text-xs text-slate-500 uppercase font-bold font-sans">Node:</span>
            <select
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
              className="bg-transparent border-0 text-slate-200 text-xs font-bold font-sans focus:ring-0 cursor-pointer"
            >
              {nodes.map(name => (
                <option key={name} value={name} className="bg-slate-950">{name}</option>
              ))}
            </select>
          </div>

          {/* Forecast Horizon toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-900 flex items-center gap-1">
            {[24, 48, 72].map(hours => (
              <button
                key={hours}
                onClick={() => setForecastHorizon(hours)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  forecastHorizon === hours ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-white'
                }`}
              >
                {hours}h
              </button>
            ))}
          </div>

          {/* Reload button */}
          <button 
            onClick={fetchForecast} 
            className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 rounded-xl cursor-pointer transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${forecastData.loading ? 'animate-spin text-violet-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Forecast Layout */}
      {forecastData.loading ? (
        <div className="flex flex-col gap-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="h-24 bg-slate-900 rounded-2xl animate-pulse" />
            <div className="h-24 bg-slate-900 rounded-2xl animate-pulse" />
            <div className="h-24 bg-slate-900 rounded-2xl animate-pulse" />
            <div className="h-24 bg-slate-900 rounded-2xl animate-pulse" />
          </div>
          <ChartSkeleton height="h-96" />
        </div>
      ) : forecastData.error ? (
        <ErrorCard 
          title="ODSS Forecast Engine Offline" 
          message={forecastData.error} 
          onRetry={fetchForecast}
        />
      ) : (
        <div className="flex flex-col gap-8 w-full">
          
          {/* Node Summary Metrics & Overall Risk Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Risk Class Summary */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Node Risk Status</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-3 py-1.5 rounded-xl text-sm font-bold tracking-wider ${getRiskBadgeClass(forecastData.data.overall_risk_level)}`}>
                  {forecastData.data.overall_risk_level}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                Aggregated system health assessment based on the composite forecast of all networking and environmental fields.
              </p>
            </div>

            {/* Confidence Bands */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Prediction Confidence</span>
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5"><Thermometer className="w-3.5 h-3.5 text-violet-400" /> Temp Margin:</span>
                  <span className="font-bold text-white font-mono">{forecastData.data.confidence_prediction_intervals?.temperature}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-sky-400" /> Humid Margin:</span>
                  <span className="font-bold text-white font-mono">{forecastData.data.confidence_prediction_intervals?.humidity}</span>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] mt-3">Confidence ranges are derived dynamically from the validation error distribution (1.96 × RMSE).</p>
            </div>

            {/* Battery Discharge Rate */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Maintenance Horizon</span>
              <div className="flex flex-col mt-2">
                <span className="text-xl font-bold font-mono text-white">
                  {forecastData.data.timeline[0]?.battery_level.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400 mt-1 font-semibold flex items-center gap-1">
                  <Hourglass className="w-3.5 h-3.5 text-amber-500" /> Estimated decay: 
                  {selectedNode === 'Bangalore' ? ' 0.15%' : selectedNode === 'Delhi' ? ' 0.30%' : ' 0.25%'} / hr
                </span>
              </div>
              <p className="text-slate-500 text-[10px] mt-2">Projects remaining battery capacity to schedule physical sensor swapping sweeps.</p>
            </div>

            {/* Total Forecast Steps */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Forecast Span</span>
              <div className="flex flex-col mt-2">
                <span className="text-xl font-bold font-mono text-violet-400">
                  {forecastData.data.forecast_horizon_h} Hours
                </span>
                <span className="text-xs text-slate-400 mt-1 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-violet-500" /> Timeline steps: {forecastData.data.timeline.length} points
                </span>
              </div>
              <p className="text-slate-500 text-[10px] mt-2">Rolling out predictions recursively at 3-hour offsets from the latest telemetry receipt.</p>
            </div>
          </div>

          {/* Operational insights and maintenance directives */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Insights and Directive Column */}
            <div className="glass-card p-6 flex flex-col gap-4 lg:col-span-1">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 m-0 border-b border-slate-900 pb-3">
                <Wrench className="w-4 h-4 text-violet-400" /> Operational Insights
              </h3>

              <div className="flex flex-col gap-4 overflow-y-auto max-h-[420px] pr-1">
                {forecastData.data.operational_insights?.length > 0 ? (
                  forecastData.data.operational_insights.map((insight, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-xl border flex flex-col gap-2.5 transition-all ${
                        insight.severity === 'CRITICAL' ? 'bg-rose-500/5 border-rose-500/15' : 
                        insight.severity === 'HIGH' ? 'bg-orange-500/5 border-orange-500/15' : 
                        insight.severity === 'MEDIUM' ? 'bg-yellow-500/5 border-yellow-500/15' : 
                        'bg-sky-500/5 border-sky-500/15'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {getInsightSeverityIcon(insight.severity)}
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold font-sans uppercase tracking-wider ${
                          insight.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                          insight.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                          insight.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-sky-500/20 text-sky-400'
                        }`}>
                          {insight.severity} RISK
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200 leading-snug">{insight.message}</span>
                        <span className="text-[11px] text-slate-400 mt-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-900 leading-relaxed font-sans">
                          <strong className="text-violet-400">Directive:</strong> {insight.recommendation}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <span className="text-xs text-slate-400 font-bold">No Operational Risks Detected</span>
                    <span className="text-[10px] text-slate-500 font-sans text-center max-w-[200px]">Node is operating within normal boundaries over the next {forecastHorizon} hours.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Environmental Forecast Chart & Timeline Panel */}
            <div className="glass-card p-6 flex flex-col gap-4 lg:col-span-2">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 m-0">
                  <Thermometer className="w-4 h-4 text-violet-400" /> Environmental Forecast
                </h3>
                <span className="text-xs text-slate-500 font-medium font-sans">Time Horizon: {forecastHorizon} Hours</span>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastData.data.timeline} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="time_label" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false}
                    />
                    <YAxis 
                      yId="left"
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', fill: '#8b5cf6', fontSize: 10 }}
                    />
                    <YAxis 
                      yId="right"
                      orientation="right"
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      label={{ value: 'Humidity (%)', angle: 90, position: 'insideRight', fill: '#06b6d4', fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f3f4f6' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={32} iconType="circle" fontSize={11} />
                    <Line 
                      yId="left"
                      name="Predicted Temp (°C)" 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#8b5cf6" 
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line 
                      yId="right"
                      name="Predicted Humidity (%)" 
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="#06b6d4" 
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Weather Condition Forecast Cards Grid */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-2">
                {forecastData.data.timeline.filter((_, idx) => idx % 4 === 0).map((step, idx) => (
                  <div key={idx} className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-900 flex flex-col items-center gap-1 text-center font-sans">
                    <span className="text-[9px] text-slate-500 font-bold uppercase font-sans">{step.time_label}</span>
                    <span className="text-xs font-bold text-white mt-0.5">{step.temperature.toFixed(1)}°C</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase mt-1 ${
                      step.condition === 'Rain' ? 'bg-blue-500/10 text-blue-400' :
                      step.condition === 'Clouds' ? 'bg-slate-400/10 text-slate-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {step.condition}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Network Forecast Timeline Panel */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 m-0">
                <Activity className="w-4 h-4 text-emerald-400" /> Network Parameter Forecast (Simulated Decline & Model Projections)
              </h3>
              <span className="text-xs text-slate-500 font-medium font-sans">Estimated Margins: Latency {forecastData.data.confidence_prediction_intervals?.latency} | Loss {forecastData.data.confidence_prediction_intervals?.packet_loss}</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData.data.timeline} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="time_label" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    label={{ value: 'Value / Score', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f3f4f6' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={32} iconType="circle" fontSize={11} />
                  <Area 
                    name="Network Health Score" 
                    type="monotone" 
                    dataKey="health_score" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorHealth)"
                  />
                  <Line 
                    name="Battery Level (%)" 
                    type="monotone" 
                    dataKey="battery_level" 
                    stroke="#059669" 
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line 
                    name="Signal RSSI (scaled, %)" 
                    type="monotone" 
                    dataKey="signal_strength" 
                    // Render RSSI normalized to [0, 100] for standard double axis compatibility
                    tickFormatter={(s) => ((s + 100) / 70 * 100).toFixed(0)}
                    stroke="#f59e0b" 
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line 
                    name="Packet Loss (%)" 
                    type="monotone" 
                    dataKey="packet_loss_rate" 
                    stroke="#f43f5e" 
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Node Forecast Details Timeline Table */}
          <div className="glass-card p-6 flex flex-col gap-4 font-mono">
            <h3 className="text-lg font-bold text-slate-200 m-0 font-sans">Prediction Timeline & Risk Profile Grid</h3>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-400 text-xs uppercase tracking-wider font-semibold sticky top-0 bg-slate-950/95 py-2.5 z-10 font-mono">
                    <th className="py-2.5 px-4">Offset</th>
                    <th className="py-2.5 px-4 font-sans">Weather</th>
                    <th className="py-2.5 px-4">Temp / Humid</th>
                    <th className="py-2.5 px-4">Battery</th>
                    <th className="py-2.5 px-4">RSSI</th>
                    <th className="py-2.5 px-4">Latency / Loss</th>
                    <th className="py-2.5 px-4">Health score</th>
                    <th className="py-2.5 px-4 font-sans">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {forecastData.data.timeline.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors duration-150 text-xs">
                      <td className="py-3 px-4 text-slate-500 font-bold font-mono">{row.time_label}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-sans ${
                          row.condition === 'Rain' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                          row.condition === 'Clouds' ? 'bg-slate-400/15 text-slate-400 border border-slate-400/20' :
                          'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        }`}>
                          {row.condition}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">{row.temperature.toFixed(1)}°C / {row.humidity.toFixed(1)}%</td>
                      <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">{row.battery_level.toFixed(1)}%</td>
                      <td className="py-3 px-4 font-mono text-amber-500 font-medium">{row.signal_strength.toFixed(1)} dBm</td>
                      <td className="py-3 px-4 font-mono">{row.latency_ms.toFixed(1)} ms / {row.packet_loss_rate.toFixed(2)}%</td>
                      <td className="py-3 px-4 font-bold text-white font-mono">{row.health_score} ({row.health_status})</td>
                      <td className="py-3 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getRiskBadgeClass(row.risk_level)}`}>
                          {row.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Legacy Model Validation & Historical Performance Accordion Section */}
      <div className="glass-card p-6 mt-4 flex flex-col gap-4">
        <button 
          onClick={() => setShowEvaluation(prev => !prev)}
          className="flex justify-between items-center w-full bg-transparent border-0 text-slate-200 hover:text-white cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            <div className="flex flex-col text-left font-sans">
              <span className="text-base font-bold m-0">Historical Model Performance & Validation</span>
              <span className="text-xs text-slate-400 font-medium mt-0.5">Statistical metrics (MAE, RMSE, R²), actuals vs predicted, and legacy model validation dashboards.</span>
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs font-bold font-sans">
            {showEvaluation ? "Hide Performance Charts" : "Show Performance Charts"}
          </div>
        </button>

        {showEvaluation && (
          <div className="flex flex-col gap-6 pt-4 border-t border-slate-900 animate-fadeIn">
            
            {/* Switiching Controls */}
            <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                {/* Env LR Selector */}
                <div className="bg-slate-950 p-1 rounded-xl border border-slate-900 flex items-center gap-1">
                  <span className="text-[9px] text-slate-500 uppercase font-extrabold px-2">Env (LR)</span>
                  <button
                    onClick={() => setChartMode('temp')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      chartMode === 'temp' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Temp
                  </button>
                  <button
                    onClick={() => setChartMode('humidity')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      chartMode === 'humidity' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Humidity
                  </button>
                </div>

                {/* Net GB Selector */}
                <div className="bg-slate-950 p-1 rounded-xl border border-slate-900 flex items-center gap-1">
                  <span className="text-[9px] text-slate-500 uppercase font-extrabold px-2">Net (GB)</span>
                  <button
                    onClick={() => setChartMode('battery')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      chartMode === 'battery' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Battery
                  </button>
                  <button
                    onClick={() => setChartMode('latency')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      chartMode === 'latency' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Latency
                  </button>
                  <button
                    onClick={() => setChartMode('packetLoss')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      chartMode === 'packetLoss' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Loss
                  </button>
                </div>
              </div>

              {/* Accuracy stats badge */}
              <div className="flex gap-6 bg-slate-950/70 p-4 rounded-xl border border-slate-900">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase">MAE</span>
                  <span className="text-sm font-bold text-white font-mono" style={{ color: modelColor }}>{activeStats.mae} {evalUnit}</span>
                </div>
                <div className="h-6 w-px bg-slate-900" />
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase">RMSE</span>
                  <span className="text-sm font-bold text-white font-mono">{activeStats.rmse} {evalUnit}</span>
                </div>
                <div className="h-6 w-px bg-slate-900" />
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase">R² Score</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">{activeStats.r2}</span>
                </div>
              </div>
            </div>

            {/* Validation Line Chart */}
            {isEvalLoading && activeEvalData.length === 0 ? (
              <ChartSkeleton height="h-80" />
            ) : (
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900/60">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-300">{evalTitle} (Actual vs Predicted Test Observations)</span>
                  <span className="text-[10px] text-slate-500 font-mono">100 sequential validation samples</span>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeEvalData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis 
                        dataKey="timestamp" 
                        stroke="#64748b" 
                        fontSize={9} 
                        tickFormatter={(t) => t ? t.split(' ')[3] : ''}
                        tickLine={false}
                      />
                      <YAxis stroke="#64748b" fontSize={9} tickLine={false} label={{ value: evalUnit, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 9 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f3f4f6' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="top" height={32} iconType="circle" fontSize={10} />
                      <Line 
                        name={`Actual`} 
                        type="monotone" 
                        dataKey="actual" 
                        stroke={modelColor} 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        name={`Predicted`} 
                        type="monotone" 
                        dataKey="predicted" 
                        stroke={chartMode === 'latency' ? '#8b5cf6' : '#f59e0b'} 
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Validation Table */}
            <div className="overflow-x-auto max-h-64 font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider font-semibold sticky top-0 bg-slate-950 py-2">
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Actual</th>
                    <th className="py-2 px-3">Predicted</th>
                    <th className="py-2 px-3">Residual Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-400">
                  {activeEvalData.slice(0, 20).map((row, idx) => {
                    const diff = row.actual - row.predicted;
                    return (
                      <tr key={idx} className="hover:bg-slate-900/20">
                        <td className="py-2 px-3 text-slate-600">{row.timestamp}</td>
                        <td className="py-2 px-3 text-slate-200">{row.actual.toFixed(2)}</td>
                        <td className="py-2 px-3" style={{ color: modelColor }}>{row.predicted.toFixed(2)}</td>
                        <td className={`py-2 px-3 ${diff >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                          {diff >= 0 ? '+' : ''}{diff.toFixed(3)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
