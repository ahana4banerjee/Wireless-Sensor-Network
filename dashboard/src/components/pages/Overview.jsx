import React from 'react';
import { Wifi, Battery, ServerCrash, Cpu, Activity, ShieldAlert, Compass } from 'lucide-react';

export default function Overview({ nodesData, liveData, alertsData, loading }) {
  // Compute summaries
  const totalNodes = nodesData?.total_nodes || 0;
  const onlineNodes = nodesData?.nodes?.filter(n => n.status === "ONLINE").length || 0;
  const activeAlerts = alertsData?.filter(a => a.severity === "CRITICAL").length || 0;
  
  // Calculate average temp of active nodes
  const activeTelemetry = liveData || [];
  const avgTemp = activeTelemetry.length > 0 
    ? (activeTelemetry.reduce((acc, curr) => acc + curr.temp, 0) / activeTelemetry.length).toFixed(1)
    : "N/A";

  const summaryCards = [
    { label: "Total Monitored Nodes", value: totalNodes, icon: Cpu, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Online Nodes", value: `${onlineNodes}/${totalNodes}`, icon: Wifi, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Critical Network Alarms", value: activeAlerts, icon: ShieldAlert, color: activeAlerts > 0 ? "text-rose-500 animate-bounce" : "text-slate-400", bg: activeAlerts > 0 ? "bg-rose-500/10" : "bg-slate-500/5" },
    { label: "Average Network Temp", value: avgTemp !== "N/A" ? `${avgTemp}°C` : avgTemp, icon: Activity, color: "text-brand-cyan", bg: "bg-cyan-500/10" },
  ];

  // Get color for battery levels
  const getBatteryColorClass = (level) => {
    if (level < 20) return "bg-rose-500";
    if (level < 50) return "bg-amber-500";
    return "bg-emerald-500";
  };

  // Get color for RSSI strength
  const getSignalStrengthLabel = (rssi) => {
    if (rssi > -60) return { label: "Excellent", color: "text-emerald-400" };
    if (rssi > -75) return { label: "Good", color: "text-cyan-400" };
    if (rssi > -85) return { label: "Fair", color: "text-amber-400" };
    return { label: "Weak", color: "text-rose-400" };
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header title */}
      <div>
        <h2 className="text-2xl font-bold text-white m-0">WSN Overview & Status</h2>
        <p className="text-slate-400 text-sm mt-1">Real-time status tracking and network diagnostics of geographical sensor nodes.</p>
      </div>

      {/* Summary metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-card p-6 flex items-center justify-between">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{card.label}</span>
                <span className="text-3xl font-extrabold text-white">{card.value}</span>
              </div>
              <div className={`p-3.5 rounded-2xl ${card.bg}`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Nodes visual status grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Compass className="w-5 h-5 text-violet-500" /> WSN Active Node Grid
        </h3>
        {loading && nodesData === null ? (
          <div className="text-slate-400 py-6 text-sm">Loading nodes health grid...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {nodesData?.nodes?.map((node) => {
              const signal = getSignalStrengthLabel(node.signal_strength);
              const isOnline = node.status === "ONLINE";
              return (
                <div key={node.node_id} className="glass-card p-5 flex flex-col gap-5 relative overflow-hidden">
                  {/* Status Indicator Ribbon */}
                  <div className={`absolute top-0 right-0 left-0 h-1 ${isOnline ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                  
                  {/* Node Name & Status */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-white leading-tight">{node.node_id}</span>
                      <span className="text-[10px] text-slate-500">Telemetry Node</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {node.status}
                    </span>
                  </div>

                  {/* Battery metrics */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 flex items-center gap-1"><Battery className="w-3.5 h-3.5" /> Battery</span>
                      <span className="font-bold text-white">{node.battery_level.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${getBatteryColorClass(node.battery_level)}`}
                        style={{ width: `${node.battery_level}%` }}
                      />
                    </div>
                  </div>

                  {/* RSSI Metrics */}
                  <div className="flex justify-between items-center border-t border-slate-900 pt-3">
                    <span className="text-xs text-slate-400">Signal (RSSI)</span>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-white">{node.signal_strength} dBm</span>
                      <span className={`text-[10px] font-medium ${signal.color}`}>{signal.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Latest live telemetry table */}
      <div className="glass-card p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-200 m-0">Live Sensors Telemetry Stream</h3>
          <span className="text-xs text-slate-400">Updated automatically</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-900 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Node City</th>
                <th className="py-3 px-4">Temp (°C)</th>
                <th className="py-3 px-4">Humidity (%)</th>
                <th className="py-3 px-4">Pressure (hPa)</th>
                <th className="py-3 px-4">Wind Speed (m/s)</th>
                <th className="py-3 px-4">Network Latency (ms)</th>
                <th className="py-3 px-4">Packet Loss (%)</th>
                <th className="py-3 px-4">Last Event Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-200">
              {activeTelemetry.map((row) => (
                <tr key={row.city} className="hover:bg-slate-900/40 transition-colors duration-150">
                  <td className="py-3.5 px-4 font-bold text-white">{row.city}</td>
                  <td className="py-3.5 px-4 font-medium text-violet-400">{row.temp.toFixed(2)} °C</td>
                  <td className="py-3.5 px-4 font-medium text-cyan-400">{row.humidity}%</td>
                  <td className="py-3.5 px-4 text-slate-300">{row.pressure}</td>
                  <td className="py-3.5 px-4 text-slate-300">{row.wind_speed}</td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{row.latency_ms} ms</td>
                  <td className={`py-3.5 px-4 font-mono font-bold ${row.packet_loss_rate > 5.0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {row.packet_loss_rate.toFixed(2)}%
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">{row.timestamp}</td>
                </tr>
              ))}
              {activeTelemetry.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 font-medium">No live telemetry available. Make sure the API gateway is online.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
