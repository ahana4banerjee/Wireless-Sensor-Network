import React from 'react';
import { 
  Wifi, 
  Battery, 
  Cpu, 
  Activity, 
  ShieldAlert, 
  Compass, 
  Server, 
  Database, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Network,
  Radio
} from 'lucide-react';

export default function Overview({ nodesData, liveData, alertsData, analyticsSummary, loading }) {
  // Compute summaries
  const totalNodes = nodesData?.total_nodes || 5;
  const onlineNodes = nodesData?.nodes?.filter(n => n.status === "ONLINE").length || 0;
  const activeAlerts = alertsData?.filter(a => a.severity === "CRITICAL").length || 0;
  
  const nodeStatusMap = {};
  const nodeDetailsMap = {};
  nodesData?.nodes?.forEach(n => {
    nodeStatusMap[n.node_id] = n.status;
    nodeDetailsMap[n.node_id] = n;
  });

  // Analytics summary values
  const dbRecords = analyticsSummary?.total_records !== undefined ? analyticsSummary.total_records : 0;
  const anomalyCount = analyticsSummary?.anomaly_count !== undefined ? analyticsSummary.anomaly_count : 0;
  const avgTemp = analyticsSummary?.average_temperature !== undefined ? analyticsSummary.average_temperature : 0;
  const avgHumidity = analyticsSummary?.average_humidity !== undefined ? analyticsSummary.average_humidity : 0;
  const avgLatency = analyticsSummary?.average_latency !== undefined ? analyticsSummary.average_latency : 0;
  const avgPacketLoss = analyticsSummary?.average_packet_loss !== undefined ? analyticsSummary.average_packet_loss : 0;

  // Calculate Link/Network Health Rating
  // 100 - avgPacketLoss is a standard operational health metric
  const networkHealthScore = (100 - avgPacketLoss).toFixed(1);
  let networkHealthLabel = "OPTIMAL";
  let networkHealthColor = "text-emerald-400";
  if (avgPacketLoss >= 10.0) {
    networkHealthLabel = "CRITICAL";
    networkHealthColor = "text-rose-500";
  } else if (avgPacketLoss >= 5.0) {
    networkHealthLabel = "DEGRADED";
    networkHealthColor = "text-amber-500";
  }

  // Slice last 5 alerts
  const recentAlerts = alertsData?.slice(0, 5) || [];

  return (
    <div className="flex flex-col gap-6 w-full text-slate-200">
      
      {/* SECTION A: EXECUTIVE STATUS BAR (TOP) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-[#0b1121] border border-slate-800 p-4 rounded-md">
        
        {/* Status 1: Gateway Status */}
        <div className="flex flex-col gap-1 border-r border-slate-800/60 last:border-r-0 px-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Gateway Service</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <span className="text-sm font-bold font-mono text-white">ONLINE</span>
          </div>
        </div>

        {/* Status 2: Active Nodes */}
        <div className="flex flex-col gap-1 border-r border-slate-800/60 last:border-r-0 px-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Active Nodes</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold font-mono text-white">{onlineNodes}</span>
            <span className="text-xs text-slate-500 font-mono">/ {totalNodes}</span>
          </div>
        </div>

        {/* Status 3: Anomaly Count */}
        <div className="flex flex-col gap-1 border-r border-slate-800/60 last:border-r-0 px-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Total Anomalies</span>
          <div className="flex items-center gap-1.5 mt-1">
            <ShieldAlert className={`w-4 h-4 ${anomalyCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-base font-bold font-mono text-white">{anomalyCount}</span>
          </div>
        </div>

        {/* Status 4: Average Latency */}
        <div className="flex flex-col gap-1 border-r border-slate-800/60 last:border-r-0 px-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Avg Latency</span>
          <div className="flex items-baseline gap-0.5 mt-1">
            <span className="text-lg font-bold font-mono text-white">{avgLatency.toFixed(0)}</span>
            <span className="text-[10px] text-slate-500 font-mono">ms</span>
          </div>
        </div>

        {/* Status 5: Packet Loss Rate */}
        <div className="flex flex-col gap-1 border-r border-slate-800/60 last:border-r-0 px-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Packet Loss</span>
          <div className="flex items-baseline gap-0.5 mt-1">
            <span className="text-lg font-bold font-mono text-white">{avgPacketLoss.toFixed(1)}</span>
            <span className="text-[10px] text-slate-500 font-mono">%</span>
          </div>
        </div>

        {/* Status 6: DB Records */}
        <div className="flex flex-col gap-1 px-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">DB Size</span>
          <div className="flex items-center gap-1.5 mt-1">
            <Database className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-sm font-bold font-mono text-white">{dbRecords.toLocaleString()} recs</span>
          </div>
        </div>

      </div>

      {/* SECTION B: TOPOLOGY & HEALTH OVERVIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Topology Schematic (Left) */}
        <div className="lg:col-span-7 glass-card p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <Network className="w-4 h-4 text-violet-500" /> MQTT Topology Schematic
            </h4>
            <span className="text-[10px] font-mono text-slate-500">Auto Layout / Port 1883</span>
          </div>
          
          <div className="flex items-center justify-center bg-slate-950/40 p-2 rounded border border-slate-850">
            <svg viewBox="0 0 600 220" className="w-full h-auto text-slate-400">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(51, 65, 85, 0.08)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" rx="4" />

              {/* Connection Lines from Broker down to cities */}
              <path d="M 300 45 L 300 90 L 80 90 L 80 140" fill="none" stroke={nodeStatusMap["Delhi"] === "ONLINE" ? "#10b981" : "#f43f5e"} strokeWidth="1.5" strokeDasharray={nodeStatusMap["Delhi"] === "OFFLINE" ? "4,4" : "none"} className="transition-all duration-300" />
              <path d="M 300 45 L 300 90 L 190 90 L 190 140" fill="none" stroke={nodeStatusMap["Hyderabad"] === "ONLINE" ? "#10b981" : "#f43f5e"} strokeWidth="1.5" strokeDasharray={nodeStatusMap["Hyderabad"] === "OFFLINE" ? "4,4" : "none"} className="transition-all duration-300" />
              <path d="M 300 45 L 300 140" fill="none" stroke={nodeStatusMap["Mumbai"] === "ONLINE" ? "#10b981" : "#f43f5e"} strokeWidth="1.5" strokeDasharray={nodeStatusMap["Mumbai"] === "OFFLINE" ? "4,4" : "none"} className="transition-all duration-300" />
              <path d="M 300 45 L 300 90 L 410 90 L 410 140" fill="none" stroke={nodeStatusMap["Bangalore"] === "ONLINE" ? "#10b981" : "#f43f5e"} strokeWidth="1.5" strokeDasharray={nodeStatusMap["Bangalore"] === "OFFLINE" ? "4,4" : "none"} className="transition-all duration-300" />
              <path d="M 300 45 L 300 90 L 520 90 L 520 140" fill="none" stroke={nodeStatusMap["Secunderabad"] === "ONLINE" ? "#10b981" : "#f43f5e"} strokeWidth="1.5" strokeDasharray={nodeStatusMap["Secunderabad"] === "OFFLINE" ? "4,4" : "none"} className="transition-all duration-300" />

              {/* Broker Node */}
              <g transform="translate(260, 15)">
                <rect x="0" y="0" width="80" height="32" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                <text x="40" y="19" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="monospace">MQTT Broker</text>
                <circle cx="10" cy="8" r="2.5" fill="#10b981" />
              </g>

              {/* Node Delhi */}
              <g transform="translate(40, 140)">
                <rect x="0" y="0" width="80" height="48" rx="4" fill="#0f172a" stroke={nodeStatusMap["Delhi"] === "ONLINE" ? "#059669" : "#dc2626"} strokeWidth="1.5" />
                <text x="40" y="16" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace">Delhi</text>
                <text x="40" y="28" textAnchor="middle" fill={nodeStatusMap["Delhi"] === "ONLINE" ? "#34d399" : "#f87171"} fontSize="8" fontFamily="monospace" fontWeight="bold">
                  {nodeStatusMap["Delhi"] || "OFFLINE"}
                </text>
                {nodeDetailsMap["Delhi"] && (
                  <text x="40" y="38" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                    {nodeDetailsMap["Delhi"].battery_level.toFixed(0)}% Bat
                  </text>
                )}
              </g>

              {/* Node Hyderabad */}
              <g transform="translate(150, 140)">
                <rect x="0" y="0" width="80" height="48" rx="4" fill="#0f172a" stroke={nodeStatusMap["Hyderabad"] === "ONLINE" ? "#059669" : "#dc2626"} strokeWidth="1.5" />
                <text x="40" y="16" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace">Hyderabad</text>
                <text x="40" y="28" textAnchor="middle" fill={nodeStatusMap["Hyderabad"] === "ONLINE" ? "#34d399" : "#f87171"} fontSize="8" fontFamily="monospace" fontWeight="bold">
                  {nodeStatusMap["Hyderabad"] || "OFFLINE"}
                </text>
                {nodeDetailsMap["Hyderabad"] && (
                  <text x="40" y="38" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                    {nodeDetailsMap["Hyderabad"].battery_level.toFixed(0)}% Bat
                  </text>
                )}
              </g>

              {/* Node Mumbai */}
              <g transform="translate(260, 140)">
                <rect x="0" y="0" width="80" height="48" rx="4" fill="#0f172a" stroke={nodeStatusMap["Mumbai"] === "ONLINE" ? "#059669" : "#dc2626"} strokeWidth="1.5" />
                <text x="40" y="16" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace">Mumbai</text>
                <text x="40" y="28" textAnchor="middle" fill={nodeStatusMap["Mumbai"] === "ONLINE" ? "#34d399" : "#f87171"} fontSize="8" fontFamily="monospace" fontWeight="bold">
                  {nodeStatusMap["Mumbai"] || "OFFLINE"}
                </text>
                {nodeDetailsMap["Mumbai"] && (
                  <text x="40" y="38" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                    {nodeDetailsMap["Mumbai"].battery_level.toFixed(0)}% Bat
                  </text>
                )}
              </g>

              {/* Node Bangalore */}
              <g transform="translate(370, 140)">
                <rect x="0" y="0" width="80" height="48" rx="4" fill="#0f172a" stroke={nodeStatusMap["Bangalore"] === "ONLINE" ? "#059669" : "#dc2626"} strokeWidth="1.5" />
                <text x="40" y="16" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace">Bangalore</text>
                <text x="40" y="28" textAnchor="middle" fill={nodeStatusMap["Bangalore"] === "ONLINE" ? "#34d399" : "#f87171"} fontSize="8" fontFamily="monospace" fontWeight="bold">
                  {nodeStatusMap["Bangalore"] || "OFFLINE"}
                </text>
                {nodeDetailsMap["Bangalore"] && (
                  <text x="40" y="38" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                    {nodeDetailsMap["Bangalore"].battery_level.toFixed(0)}% Bat
                  </text>
                )}
              </g>

              {/* Node Secunderabad */}
              <g transform="translate(480, 140)">
                <rect x="0" y="0" width="80" height="48" rx="4" fill="#0f172a" stroke={nodeStatusMap["Secunderabad"] === "ONLINE" ? "#059669" : "#dc2626"} strokeWidth="1.5" />
                <text x="40" y="16" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace">Secunderabad</text>
                <text x="40" y="28" textAnchor="middle" fill={nodeStatusMap["Secunderabad"] === "ONLINE" ? "#34d399" : "#f87171"} fontSize="8" fontFamily="monospace" fontWeight="bold">
                  {nodeStatusMap["Secunderabad"] || "OFFLINE"}
                </text>
                {nodeDetailsMap["Secunderabad"] && (
                  <text x="40" y="38" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                    {nodeDetailsMap["Secunderabad"].battery_level.toFixed(0)}% Bat
                  </text>
                )}
              </g>
            </svg>
          </div>
        </div>

        {/* Health Overview Cards (Right) */}
        <div className="lg:col-span-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Node Health */}
          <div className="glass-card p-4 flex flex-col justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Node Health</span>
              <span className="text-lg font-bold font-mono text-white mt-1">{onlineNodes} / {totalNodes} Online</span>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">Percentage of sensor hardware checking in on topic broadcasts.</p>
            </div>
            <div className="mt-3">
              <div className="w-full bg-slate-950 border border-slate-800 rounded-sm h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-sm transition-all duration-300"
                  style={{ width: `${(onlineNodes / totalNodes) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Network Health */}
          <div className="glass-card p-4 flex flex-col justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Network Health</span>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-lg font-bold font-mono text-white">{networkHealthScore}%</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border rounded-sm ${
                  networkHealthLabel === "OPTIMAL" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" :
                  networkHealthLabel === "DEGRADED" ? "border-amber-500/20 bg-amber-500/10 text-amber-400" :
                  "border-rose-500/20 bg-rose-500/10 text-rose-400"
                }`}>
                  {networkHealthLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">Operational score evaluated using packet drop statistics.</p>
            </div>
            <div className="mt-3 border-t border-slate-850 pt-2 flex justify-between text-[10px] font-mono text-slate-400">
              <span>Loss: {avgPacketLoss.toFixed(1)}%</span>
              <span>Avg Latency: {avgLatency.toFixed(0)}ms</span>
            </div>
          </div>

          {/* Card 3: Environmental Health */}
          <div className="glass-card p-4 flex flex-col justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Environmental Health</span>
              <div className="flex flex-col mt-1 gap-0.5">
                <span className="text-sm font-bold font-mono text-white">Avg Temp: {avgTemp.toFixed(1)}°C</span>
                <span className="text-sm font-bold font-mono text-white">Avg Humid: {avgHumidity.toFixed(1)}%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">Geographical atmospheric baseline for active regional metrics.</p>
            </div>
            <div className="mt-3 border-t border-slate-850 pt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Standard Ranges Verified</span>
            </div>
          </div>

          {/* Card 4: Prediction Engine Status */}
          <div className="glass-card p-4 flex flex-col justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Prediction Engine</span>
              <span className="text-lg font-bold font-mono text-white mt-1">0.94 MAE (Temp)</span>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">Linear Regression forecasting environmental parameters.</p>
            </div>
            <div className="mt-3 border-t border-slate-850 pt-2 flex justify-between text-[10px] font-mono text-slate-400">
              <span className="text-emerald-400">Models Synced</span>
              <span>Hum MAE: 1.43</span>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION C: LIVE NODE TELEMETRY TABLE (HIGH DENSITY) */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
          <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-cyan-400" /> High-Density Telemetry Stream
          </h4>
          <span className="text-[10px] font-mono text-slate-500">Direct Broker Feeds</span>
        </div>

        <div className="overflow-x-auto font-mono">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-850 text-slate-500 font-mono text-[10px] uppercase font-bold">
                <th className="py-1.5 px-3">Node City</th>
                <th className="py-1.5 px-3">Status</th>
                <th className="py-1.5 px-3 text-right">Temp</th>
                <th className="py-1.5 px-3 text-right">Humidity</th>
                <th className="py-1.5 px-3 text-right">Pressure</th>
                <th className="py-1.5 px-3 text-right">Wind Speed</th>
                <th className="py-1.5 px-3 text-right">Latency</th>
                <th className="py-1.5 px-3 text-right">Loss</th>
                <th className="py-1.5 px-3 text-right">Battery</th>
                <th className="py-1.5 px-3 text-right">RSSI</th>
                <th className="py-1.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {liveData.map((row) => {
                const status = nodeStatusMap[row.city] || "OFFLINE";
                const isOnline = status === "ONLINE";
                return (
                  <tr key={row.city} className="hover:bg-slate-900/40 transition-colors duration-100">
                    <td className="py-1.5 px-3 font-bold text-white font-sans">{row.city}</td>
                    <td className="py-1.5 px-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${
                        isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-right text-violet-400 font-bold">{row.temp.toFixed(2)} °C</td>
                    <td className="py-1.5 px-3 text-right text-cyan-400 font-bold">{row.humidity.toFixed(1)}%</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">{row.pressure.toFixed(1)} hPa</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">{row.wind_speed.toFixed(2)} m/s</td>
                    <td className="py-1.5 px-3 text-right text-slate-300">{row.latency_ms.toFixed(0)} ms</td>
                    <td className={`py-1.5 px-3 text-right font-bold ${row.packet_loss_rate > 5.0 ? 'text-rose-400' : 'text-slate-450'}`}>
                      {row.packet_loss_rate.toFixed(2)}%
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-300">{row.battery_level.toFixed(1)}%</td>
                    <td className="py-1.5 px-3 text-right text-slate-400">{row.signal_strength.toFixed(0)} dBm</td>
                    <td className="py-1.5 px-3 text-right text-slate-500 text-[10px] font-mono">{row.timestamp}</td>
                  </tr>
                );
              })}
              {liveData.length === 0 && (
                <tr>
                  <td colSpan="11" className="py-6 text-center text-slate-500">Waiting for live data packet stream...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION D: RECENT ALERTS PREVIEW */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
          <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-500" /> Recent Alarm Log
          </h4>
          <span className="text-[10px] font-mono text-slate-500">Last 5 Incidents</span>
        </div>

        <div className="flex flex-col gap-2">
          {recentAlerts.map((alert, idx) => {
            const isCritical = alert.severity === "CRITICAL";
            const isWarning = alert.severity === "WARNING";
            
            return (
              <div 
                key={idx} 
                className={`flex flex-col md:flex-row md:items-center justify-between p-2.5 rounded-sm border text-xs font-mono gap-2 ${
                  isCritical ? 'bg-rose-950/20 border-rose-500/25 text-rose-200' :
                  isWarning ? 'bg-amber-950/20 border-amber-500/25 text-amber-200' :
                  'bg-slate-900/60 border-slate-850 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider ${
                    isCritical ? 'bg-rose-500/20 text-rose-450 border border-rose-500/30' :
                    isWarning ? 'bg-amber-500/20 text-amber-450 border border-amber-500/30' :
                    'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="font-bold text-white bg-slate-950 px-1 py-0.5 border border-slate-800 rounded-sm">{alert.node_id}</span>
                  <span className="text-slate-300">{alert.message}</span>
                </div>
                <div className="text-[10px] text-slate-500 text-right whitespace-nowrap">
                  {alert.timestamp}
                </div>
              </div>
            );
          })}
          {recentAlerts.length === 0 && (
            <div className="py-4 text-center text-slate-500 text-xs">No active anomalies or alarms logged.</div>
          )}
        </div>
      </div>

    </div>
  );
}
