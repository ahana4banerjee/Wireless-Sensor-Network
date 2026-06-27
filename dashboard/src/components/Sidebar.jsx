import { LayoutDashboard, BarChart3, Binary, Bell, Radio, Settings, FileDown, Brain } from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, autoRefresh, setAutoRefresh, apiOnline, pollingInterval = 10 }) {
  const menuItems = [
    { id: 'mission-control', label: 'Mission Control', icon: LayoutDashboard },
    { id: 'network-intelligence', label: 'Network Intelligence', icon: BarChart3 },
    { id: 'predictive-analytics', label: 'Predictive Analytics', icon: Binary },
    { id: 'ml-operations', label: 'ML Operations', icon: Brain },
    { id: 'incident-center', label: 'Incident Center', icon: Bell },
    { id: 'simulation-settings', label: 'Simulation Settings', icon: Settings },
    { id: 'export-center', label: 'Export Center', icon: FileDown },
  ];


  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col justify-between h-screen sticky top-0 p-6">
      <div className="flex flex-col gap-8">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="bg-violet-600/20 p-2.5 rounded-xl border border-violet-500/30">
            <Radio className="w-6 h-6 text-violet-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white m-0">WSN Monitor</h1>
            <span className="text-xs text-slate-500 font-medium uppercase">Simulation Node</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer controls & health status */}
      <div className="flex flex-col gap-4 border-t border-slate-900 pt-6">
        {/* Polling Switch */}
        <div className="flex items-center justify-between bg-slate-900/50 p-3.5 rounded-xl border border-slate-900">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-slate-300">Live Polling</span>
            <span className="text-[10px] text-slate-500">Every {pollingInterval} seconds</span>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`w-11 h-6 rounded-full transition-colors relative duration-200 focus:outline-none cursor-pointer ${
              autoRefresh ? 'bg-violet-600' : 'bg-slate-800'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                autoRefresh ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* API Server status indicator */}
        <div className="flex items-center gap-3 bg-slate-900/30 p-3 rounded-xl border border-slate-900/50">
          <div className={`w-3 h-3 rounded-full ${apiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-300">FastAPI Gateway</span>
            <span className="text-[10px] text-slate-500">{apiOnline ? 'Online on Port 8000' : 'Connection Failure'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
