import { useEffect, useState } from 'react';
import { wsnApi, EXPORT_URLS } from '../../services/api';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  AlertTriangle, 
  TrendingUp, 
  Database,
  Info, 
  Loader2, 
  Activity
} from 'lucide-react';

export default function ExportCenter() {
  const [reportPreview, setReportPreview] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [predictionType, setPredictionType] = useState('temp_pred');
  const [downloading, setDownloading] = useState(null); // Tracks active download ID for spinner states

  // Load preview on mount
  useEffect(() => {
    async function loadPreview() {
      try {
        const text = await wsnApi.getSystemSummaryText();
        // Take first 25 lines for the preview box
        const lines = text.split('\n').slice(0, 25).join('\n');
        setReportPreview(lines + '\n\n... [Truncated Preview: Download report to read full summary] ...');
      } catch (err) {
        console.error("Failed to load report preview:", err);
        setReportPreview("Error: Failed to fetch live summary report preview from server.");
      } finally {
        setLoadingPreview(false);
      }
    }
    loadPreview();
  }, []);

  const handleDownload = (url, downloadId) => {
    setDownloading(downloadId);
    // Stagger a small delay to show feedback spinner, then open URL
    setTimeout(() => {
      window.open(url, '_blank');
      setDownloading(null);
    }, 800);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-8 w-full text-slate-200">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold text-white m-0">Export & Reporting Center</h2>
        <p className="text-slate-400 text-sm mt-1">Export simulation telemetry datasets, predictions output files, operational incident logs, and compile dynamic grid health summary reports.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
        
        {/* Left Column: Data & Reports Cards */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Card 1: Telemetry & Log Exports */}
          <div className="glass-card p-6 flex flex-col gap-6">
            <h3 className="text-sm font-mono uppercase font-bold text-violet-400 border-b border-slate-900 pb-2 flex items-center gap-1.5 m-0">
              <Database className="w-4 h-4" /> 1. Telemetry & Log Datasets
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Telemetry Dataset */}
              <div className="bg-slate-950/60 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> WSN Master Telemetry
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed m-0">
                    Aggregated raw and processed historical telemetry logs from Hyderabad, Delhi, Mumbai, Bangalore, and Secunderabad. Contains columns for temp, humidity, RSSI, latency, sequence counts, and ML anomaly flags.
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(EXPORT_URLS.telemetry, 'telemetry')}
                  disabled={downloading !== null}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-all cursor-pointer"
                >
                  {downloading === 'telemetry' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Export CSV Dataset
                </button>
              </div>

              {/* Alerts Log */}
              <div className="bg-slate-950/60 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Alerts & Fault Log
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed m-0">
                    Converts the backend's JSON Lines database log of active and historical operational alarms (battery depletions, latency spikes, signal weak margins) into clean, spreadsheet-friendly CSV columns on the fly.
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(EXPORT_URLS.alerts, 'alerts')}
                  disabled={downloading !== null}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-all cursor-pointer"
                >
                  {downloading === 'alerts' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Export CSV Log
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: ML Model Predictions Export */}
          <div className="glass-card p-6 flex flex-col gap-6">
            <h3 className="text-sm font-mono uppercase font-bold text-cyan-400 border-b border-slate-900 pb-2 flex items-center gap-1.5 m-0">
              <TrendingUp className="w-4 h-4" /> 2. ML Predictions Output
            </h3>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-slate-950/40 border border-slate-900 p-5 rounded-2xl">
              <div className="flex flex-col gap-3 max-w-md">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-300">Select Target Model Dataset</span>
                  <p className="text-slate-400 text-xs leading-relaxed m-0">
                    Retrieve predictions vs actual validations generated by either baseline Linear Regression or the optimized Gradient Boosting regressor models.
                  </p>
                </div>
                
                <select
                  value={predictionType}
                  onChange={(e) => setPredictionType(e.target.value)}
                  className="bg-slate-950 border border-slate-900 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-cyan-500 font-sans text-white w-full md:w-72"
                >
                  <option value="temp_pred">Delhi Temperature Forecasts (LR)</option>
                  <option value="humidity_pred">Regional Humidity Forecasts (LR)</option>
                  <option value="battery_pred">Gradient Boosting: Battery Decay Predictions</option>
                  <option value="latency_pred">Gradient Boosting: Latency Spike Predictions</option>
                  <option value="packet_loss_pred">Gradient Boosting: Packet Loss Predictions</option>
                </select>
              </div>

              <button
                onClick={() => handleDownload(EXPORT_URLS.prediction(predictionType), 'prediction')}
                disabled={downloading !== null}
                className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white transition-all cursor-pointer shrink-0"
              >
                {downloading === 'prediction' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Download Predictions CSV
              </button>
            </div>
          </div>

          {/* Card 3: Specifications & Specs Reports */}
          <div className="glass-card p-6 flex flex-col gap-6">
            <h3 className="text-sm font-mono uppercase font-bold text-emerald-400 border-b border-slate-900 pb-2 flex items-center gap-1.5 m-0">
              <FileText className="w-4 h-4" /> 3. Specifications & Analysis Reports
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Anomaly Spec */}
              <div className="flex flex-col gap-3 bg-slate-950/40 border border-slate-900 p-5 rounded-2xl">
                <div className="flex flex-col gap-1">
                  <span className="text-white font-semibold text-xs">Anomaly Detection EDA Report</span>
                  <p className="text-slate-500 text-[11px] leading-relaxed m-0">
                    Summary metrics compiled during Exploratory Data Analysis. Contains feature statistics ranges, Pearson correlations, duplicates, and Isolation Forest contamination ratios.
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(EXPORT_URLS.reportAnomaly, 'anomaly_report')}
                  disabled={downloading !== null}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 hover:bg-slate-950/20 transition-all cursor-pointer mt-2"
                >
                  {downloading === 'anomaly_report' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  Download Text Report
                </button>
              </div>

              {/* NHI Spec */}
              <div className="flex flex-col gap-3 bg-slate-950/40 border border-slate-900 p-5 rounded-2xl">
                <div className="flex flex-col gap-1">
                  <span className="text-white font-semibold text-xs">Network Health Index Spec Report</span>
                  <p className="text-slate-500 text-[11px] leading-relaxed m-0">
                    Specification documentation for the engineering-based WSN health metric equations. Contains subscore weights, mathematical formulations, and status class classifications.
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(EXPORT_URLS.reportHealth, 'health_report')}
                  disabled={downloading !== null}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 hover:bg-slate-950/20 transition-all cursor-pointer mt-2"
                >
                  {downloading === 'health_report' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  Download Text Report
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Dynamic Summary & PDF Snapshot */}
        <div className="flex flex-col gap-8">
          
          {/* Card 4: Dynamic Summary Report Preview */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <h3 className="text-sm font-mono uppercase font-bold text-violet-400 border-b border-slate-900 pb-2 flex items-center gap-1.5 m-0">
              <Activity className="w-4 h-4 text-violet-400" /> Grid Summary Report
            </h3>
            
            <p className="text-slate-400 text-xs leading-relaxed m-0">
              Generates a real-time system metrics summary of the entire grid, incorporating current health scores, active warnings, and dataset averages.
            </p>

            <div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto bg-slate-950 border border-slate-900/60 rounded-xl p-4 font-mono text-[10px] leading-relaxed text-slate-400 select-none no-print">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-48 w-full gap-2">
                  <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                  <span>Compiling dynamic preview...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono m-0 text-left">{reportPreview}</pre>
              )}
            </div>

            <button
              onClick={() => handleDownload(EXPORT_URLS.systemSummary, 'system_summary')}
              disabled={downloading !== null || loadingPreview}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-all cursor-pointer"
            >
              {downloading === 'system_summary' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download Full Report
            </button>
          </div>

          {/* Card 5: PDF Snapshot Generation */}
          <div className="glass-card p-6 flex flex-col gap-4 border border-violet-500/10">
            <h3 className="text-sm font-mono uppercase font-bold text-violet-400 border-b border-slate-900 pb-2 flex items-center gap-1.5 m-0">
              <Printer className="w-4 h-4 text-violet-400 animate-pulse" /> PDF Snapshot
            </h3>
            
            <p className="text-slate-400 text-xs leading-relaxed m-0">
              Captures a print-ready snapshot layout of the active dashboard page. Hides menus automatically for presentation reports.
            </p>

            <div className="bg-slate-950/30 border border-slate-900/50 p-3 rounded-xl flex items-start gap-2.5">
              <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
              <span className="text-[10px] text-slate-400 leading-normal m-0">
                <strong>Tip:</strong> In the browser print dialog, set layout to <strong>Landscape</strong>, scale to <strong>Fit to page</strong> (or 90%), and enable **Background graphics** to ensure dark theme backgrounds match perfectly.
              </span>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-bold border border-violet-500/30 text-violet-400 hover:text-white hover:bg-violet-600/10 transition-all cursor-pointer mt-2"
            >
              <Printer className="w-4 h-4" /> Generate PDF Snapshot
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
