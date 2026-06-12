import { useEffect, useState } from 'react';
import { wsnApi } from '../../services/api';
import { Sliders, Save, RotateCcw, AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react';
import { SettingsSkeleton } from '../ui/Skeletons';

const DEFAULTS = {
  data_interval: 60,
  heartbeat_interval: 20,
  packet_loss_rate: 0.05,
  max_delay_ms: 1500,
  battery_discharge_heartbeat: 0.1,
  battery_discharge_data: 0.5,
  battery_discharge_idle: 0.01,
  rssi_baseline: -60.0,
  rssi_noise: 3.0,
  polling_interval: 10
};

export default function Settings() {
  const [formData, setFormData] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: string }

  // Load active configurations on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await wsnApi.getSettings();
        setFormData(res.simulation);
      } catch (err) {
        console.error("Failed to load settings:", err);
        setNotification({ type: 'error', message: "Failed to fetch active configurations from server." });
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === "" ? "" : Number(value)
    }));
  };

  // Enforce range checks on fields
  const validate = () => {
    if (formData.data_interval < 5 || formData.data_interval > 3600) {
      return "Data Interval must be between 5 and 3600 seconds.";
    }
    if (formData.heartbeat_interval < 2 || formData.heartbeat_interval > 300) {
      return "Heartbeat Interval must be between 2 and 300 seconds.";
    }
    if (formData.packet_loss_rate < 0.0 || formData.packet_loss_rate > 1.0) {
      return "Packet Loss Rate must be between 0.0 and 1.0 (e.g. 0.05 for 5%).";
    }
    if (formData.max_delay_ms < 0 || formData.max_delay_ms > 10000) {
      return "Maximum Delay must be between 0 and 10000 ms.";
    }
    if (formData.battery_discharge_heartbeat < 0.0 || formData.battery_discharge_heartbeat > 10.0) {
      return "Battery Discharge (Heartbeat) must be between 0.0% and 10.0%.";
    }
    if (formData.battery_discharge_data < 0.0 || formData.battery_discharge_data > 10.0) {
      return "Battery Discharge (Data) must be between 0.0% and 10.0%.";
    }
    if (formData.battery_discharge_idle < 0.0 || formData.battery_discharge_idle > 10.0) {
      return "Battery Discharge (Idle) must be between 0.0% and 10.0%.";
    }
    if (formData.rssi_baseline < -100.0 || formData.rssi_baseline > -30.0) {
      return "RSSI Baseline must be between -100.0 and -30.0 dBm.";
    }
    if (formData.rssi_noise < 0.0 || formData.rssi_noise > 10.0) {
      return "RSSI Noise must be between 0.0 and 10.0 dB.";
    }
    if (formData.polling_interval < 1 || formData.polling_interval > 60) {
      return "Polling Interval must be between 1 and 60 seconds.";
    }
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errorMsg = validate();
    if (errorMsg) {
      setNotification({ type: 'error', message: errorMsg });
      return;
    }

    setSaving(true);
    setNotification(null);
    const delay = new Promise(resolve => setTimeout(resolve, 2000));
    try {
      await wsnApi.updateSettings(formData);
      await delay;
      setNotification({ type: 'success', message: "Configurations saved successfully! Virtual nodes will dynamically reload updates within 5s." });
    } catch (err) {
      await delay;
      setNotification({ type: 'error', message: err.message || "Failed to update configurations." });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setResetting(true);
    setNotification(null);
    setTimeout(() => {
      setFormData(DEFAULTS);
      setNotification({ type: 'info', message: "Fields reset to factory default values. Click Save to persist." });
      setResetting(false);
    }, 2000);
  };


  if (loading) {
    return (
      <div className="flex flex-col gap-8 w-full text-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-white m-0 font-sans">Simulation Settings</h2>
          <p className="text-slate-400 text-sm mt-1 font-sans">Adjust live virtual sensor nodes execution frequencies, network packet losses, battery discharge rates, and dashboard polling times.</p>
        </div>
        <SettingsSkeleton />
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-8 w-full text-slate-200">
      {/* Header title */}
      <div>
        <h2 className="text-2xl font-bold text-white m-0">Simulation Settings</h2>
        <p className="text-slate-400 text-sm mt-1">Adjust live virtual sensor nodes execution frequencies, network packet losses, battery discharge rates, and dashboard polling times.</p>
      </div>

      {/* Notifications banner */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 max-w-3xl transition-all duration-200 ${
          notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          notification.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
          'bg-violet-500/10 border-violet-500/20 text-violet-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> :
           notification.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> :
           <Info className="w-5 h-5 shrink-0 mt-0.5" />}
          <div>
            <span className="text-sm font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Settings Card */}
      <form onSubmit={handleSave} className="glass-card p-6 md:p-8 max-w-4xl flex flex-col gap-8">
        
        {/* Section 1: Transmission Frequencies */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-mono uppercase font-bold text-violet-400 border-b border-slate-900 pb-2 flex items-center gap-1.5">
            <Sliders className="w-4 h-4" /> 1. Transmission Frequencies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-slate-400 uppercase">Data Interval (s)</label>
              <input
                type="number"
                name="data_interval"
                value={formData.data_interval}
                onChange={handleChange}
                className="bg-slate-950 border border-slate-900 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-violet-500 font-mono text-white"
                placeholder="e.g. 60"
                required
              />
              <span className="text-[10px] text-slate-500">Interval for full weather packet. Range: [5 - 3600]</span>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-slate-400 uppercase">Heartbeat Interval (s)</label>
              <input
                type="number"
                name="heartbeat_interval"
                value={formData.heartbeat_interval}
                onChange={handleChange}
                className="bg-slate-950 border border-slate-900 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-violet-500 font-mono text-white"
                placeholder="e.g. 20"
                required
              />
              <span className="text-[10px] text-slate-500">Frequency of status updates. Range: [2 - 300]</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-slate-400 uppercase">Dashboard Polling (s)</label>
              <input
                type="number"
                name="polling_interval"
                value={formData.polling_interval}
                onChange={handleChange}
                className="bg-slate-950 border border-slate-900 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-violet-500 font-mono text-white"
                placeholder="e.g. 10"
                required
              />
              <span className="text-[10px] text-slate-500">React client API refresh rate. Range: [1 - 60]</span>
            </div>
          </div>
        </div>

        {/* Section 2: Network Quality Simulation */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-mono uppercase font-bold text-cyan-400 border-b border-slate-900 pb-2 flex items-center gap-1.5">
            <Sliders className="w-4 h-4" /> 2. Network Quality Constraints
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-slate-400 uppercase">Packet Loss Rate</label>
              <input
                type="number"
                step="0.01"
                name="packet_loss_rate"
                value={formData.packet_loss_rate}
                onChange={handleChange}
                className="bg-slate-950 border border-slate-900 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-cyan-500 font-mono text-white"
                placeholder="e.g. 0.05"
                required
              />
              <span className="text-[10px] text-slate-500">Probability of drop-outs. Range: [0.0 - 1.0]</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-slate-400 uppercase">Maximum Delay (ms)</label>
              <input
                type="number"
                name="max_delay_ms"
                value={formData.max_delay_ms}
                onChange={handleChange}
                className="bg-slate-950 border border-slate-900 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-cyan-500 font-mono text-white"
                placeholder="e.g. 1500"
                required
              />
              <span className="text-[10px] text-slate-500">Upper limit of latency spike. Range: [0 - 10000]</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-slate-400 uppercase">RSSI Baseline (dBm)</label>
              <input
                type="number"
                step="0.1"
                name="rssi_baseline"
                value={formData.rssi_baseline}
                onChange={handleChange}
                className="bg-slate-950 border border-slate-900 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-cyan-500 font-mono text-white"
                placeholder="e.g. -60"
                required
              />
              <span className="text-[10px] text-slate-500">Signal strength baseline. Range: [-100.0 - -30.0]</span>
            </div>
          </div>
        </div>

        {/* Section 3: Battery Discharge Rates */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-mono uppercase font-bold text-emerald-400 border-b border-slate-900 pb-2 flex items-center gap-1.5">
            <Sliders className="w-4 h-4" /> 3. Power Consumption Simulation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1.5 col-span-1">
              <label className="text-xs font-mono font-bold text-slate-400 uppercase">Idle Discharge (%)</label>
              <input
                type="number"
                step="0.001"
                name="battery_discharge_idle"
                value={formData.battery_discharge_idle}
                onChange={handleChange}
                className="bg-slate-950 border border-slate-900 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-white"
                placeholder="e.g. 0.01"
                required
              />
              <span className="text-[10px] text-slate-500">Loss per idle second. Range: [0.0 - 10.0]</span>
            </div>

            <div className="flex flex-col gap-1.5 col-span-1">
              <label className="text-xs font-mono font-bold text-slate-400 uppercase">Heartbeat Cost (%)</label>
              <input
                type="number"
                step="0.01"
                name="battery_discharge_heartbeat"
                value={formData.battery_discharge_heartbeat}
                onChange={handleChange}
                className="bg-slate-950 border border-slate-900 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-white"
                placeholder="e.g. 0.1"
                required
              />
              <span className="text-[10px] text-slate-500">Loss per status check. Range: [0.0 - 10.0]</span>
            </div>

            <div className="flex flex-col gap-1.5 col-span-1">
              <label className="text-xs font-mono font-bold text-slate-400 uppercase">Data Payload Cost (%)</label>
              <input
                type="number"
                step="0.01"
                name="battery_discharge_data"
                value={formData.battery_discharge_data}
                onChange={handleChange}
                className="bg-slate-950 border border-slate-900 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-white"
                placeholder="e.g. 0.5"
                required
              />
              <span className="text-[10px] text-slate-500">Loss per weather send. Range: [0.0 - 10.0]</span>
            </div>

            <div className="flex flex-col gap-1.5 col-span-1">
              <label className="text-xs font-mono font-bold text-slate-400 uppercase">RSSI Signal Noise (dB)</label>
              <input
                type="number"
                step="0.1"
                name="rssi_noise"
                value={formData.rssi_noise}
                onChange={handleChange}
                className="bg-slate-950 border border-slate-900 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-white"
                placeholder="e.g. 3.0"
                required
              />
              <span className="text-[10px] text-slate-500">Gaussian deviation. Range: [0.0 - 10.0]</span>
            </div>
          </div>
        </div>
        {/* Buttons Row */}
        <div className="flex items-center gap-4 mt-4 border-t border-slate-900 pt-6">
          <button
            type="submit"
            disabled={saving || resetting}
            style={{ minWidth: '185px' }}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white transition-all cursor-pointer shadow-lg shadow-violet-600/10 ${
              (saving || resetting) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving Changes..." : "Save Configuration"}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            disabled={saving || resetting}
            style={{ minWidth: '155px' }}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-950/20 transition-all cursor-pointer ${
              (saving || resetting) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {resetting ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            {resetting ? "Resetting..." : "Reset Defaults"}
          </button>
        </div>

      </form>
    </div>
  );
}
