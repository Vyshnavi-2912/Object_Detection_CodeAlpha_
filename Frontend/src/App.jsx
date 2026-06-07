import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import LiveCamera from './pages/LiveCamera';
import VideoUpload from './pages/VideoUpload';
import Analytics from './pages/Analytics';
import Logs from './pages/Logs';
import { Clock, Server, Cpu, Database as DbIcon, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [currentTime, setCurrentTime] = useState('');
  
  // Health states
  const [health, setHealth] = useState({
    backend: false,
    database: false,
    yolo: false,
    api: false
  });

  // Check connection to backend & systems health
  const checkConnection = async () => {
    try {
      const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
      const res = await axios.get(`http://${hostname}:8000/api/health`);
      if (res.status === 200 && res.data.success) {
        setHealth({
          backend: res.data.backend === 'online',
          database: res.data.database === 'online',
          yolo: res.data.yolo === 'online',
          api: res.data.api === 'online'
        });
      } else {
        setHealth({ backend: false, database: false, yolo: false, api: false });
      }
    } catch (err) {
      setHealth({ backend: false, database: false, yolo: false, api: false });
    }
  };

  useEffect(() => {
    checkConnection();
    // Ping backend health every 4 seconds
    const interval = setInterval(checkConnection, 4000);
    return () => clearInterval(interval);
  }, []);

  // Update clock time
  useEffect(() => {
    const updateClock = () => {
      const date = new Date();
      setCurrentTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Render active component
  const renderContent = () => {
    switch (activeTab) {
      case 'landing':
        return <LandingPage setActiveTab={setActiveTab} />;
      case 'webcam':
        return <LiveCamera />;
      case 'video':
        return <VideoUpload />;
      case 'analytics':
        return <Analytics />;
      case 'logs':
        return <Logs />;
      default:
        return <LandingPage setActiveTab={setActiveTab} />;
    }
  };

  const getPageHeaderTitle = () => {
    switch (activeTab) {
      case 'landing': return 'Overview Portal';
      case 'webcam': return 'Stream Analyzer';
      case 'video': return 'Footage Processor';
      case 'analytics': return 'Telemetry Charts';
      case 'logs': return 'SQLite Records';
      default: return 'Overview Portal';
    }
  };

  return (
    <div className="flex bg-brand-bg min-h-screen text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        backendStatus={health.backend} 
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Top Header navbar */}
        <header className="glass-panel border-b border-brand-border/60 py-3.5 px-8 flex flex-wrap items-center justify-between sticky top-0 z-40 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">AuraTrack Workspace</span>
            <span className="text-slate-600 text-xs">/</span>
            <span className="text-xs font-semibold text-brand-glow uppercase tracking-wider">{getPageHeaderTitle()}</span>
          </div>

          {/* Real-time System health indicator panels */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-xs">
              {/* API status */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-brand-border">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-semibold">API:</span>
                <span className={`font-bold ${health.api ? 'text-brand-glow' : 'text-rose-500 animate-pulse'}`}>
                  {health.api ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              {/* YOLO status */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-brand-border">
                <Cpu className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-semibold">YOLO:</span>
                <span className={`font-bold ${health.yolo ? 'text-brand-glow' : 'text-rose-500 animate-pulse'}`}>
                  {health.yolo ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              {/* DB status */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-brand-border">
                <DbIcon className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-semibold">DB:</span>
                <span className={`font-bold ${health.database ? 'text-brand-glow' : 'text-rose-500 animate-pulse'}`}>
                  {health.database ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>

            {/* Time clock */}
            <div className="flex items-center gap-2 bg-slate-900 border border-brand-border px-3.5 py-1.5 rounded-xl text-xs font-semibold">
              <Clock className="w-4 h-4 text-brand-glow" />
              <span className="text-white font-mono">{currentTime || '--:--:--'}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-x-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
