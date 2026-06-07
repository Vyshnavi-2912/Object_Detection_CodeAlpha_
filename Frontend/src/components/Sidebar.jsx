import React from 'react';
import { 
  Home, 
  Camera, 
  Upload, 
  BarChart3, 
  Database,
  Cpu,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, backendStatus }) {
  const menuItems = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'webcam', label: 'Live Webcam', icon: Camera },
    { id: 'video', label: 'Video Upload', icon: Upload },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'logs', label: 'Activity Logs', icon: Database }
  ];

  return (
    <aside className="w-64 glass-panel border-r border-brand-border h-screen flex flex-col justify-between p-4 sticky top-0">
      <div className="flex flex-col gap-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-glow to-brand-purple flex items-center justify-center shadow-neon-cyan glow-pulse-cyan">
            <Cpu className="w-6 h-6 text-brand-bg font-bold" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-white font-sans bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              AuraTrack<span className="text-brand-glow font-bold">.AI</span>
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Vision Suite</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-brand-purple/20 to-brand-glow/10 border-l-2 border-brand-glow text-white shadow-sm' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-brand-glow' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="flex flex-col gap-4 border-t border-brand-border/60 pt-4">
        {/* Connection status */}
        <div className="flex items-center justify-between px-2 text-xs">
          <span className="text-slate-400">System Link:</span>
          <div className="flex items-center gap-1.5 font-medium">
            {backendStatus ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-rose-500" />
                <span className="text-rose-500">OFFLINE</span>
              </>
            )}
          </div>
        </div>

        <div className="px-2 text-[10px] text-slate-500 text-center font-medium">
          V1.0.0 | Senior Vision Project
        </div>
      </div>
    </aside>
  );
}
