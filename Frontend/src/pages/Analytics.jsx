import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Sparkles,
  RefreshCw,
  Eye,
  Map,
  ShieldAlert,
  Sliders
} from 'lucide-react';

const COLORS = ['#7c3aed', '#00f2fe', '#ff5a5f', '#34d399', '#fbbf24', '#a78bfa'];

export default function Analytics() {
  const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heatmapKey, setHeatmapKey] = useState(Date.now());

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res1 = await axios.get(`http://${hostname}:8000/api/analytics`);
      if (res1.data.success) {
        setData(res1.data);
      }
      
      const res2 = await axios.get(`http://${hostname}:8000/api/insights`);
      if (res2.data.success) {
        setInsights(res2.data.insights);
      }
      
      setHeatmapKey(Date.now());
    } catch (err) {
      console.error("Error fetching analytics data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh analytics when window/tab is focused
    window.addEventListener('focus', fetchAnalytics);
    return () => {
      window.removeEventListener('focus', fetchAnalytics);
    };
  }, []);

  if (isLoading || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-brand-glow/10 border-t-brand-glow rounded-full animate-spin mb-4" />
        <span className="text-slate-400 text-sm font-semibold">Aggregating telemetry logs statistics...</span>
      </div>
    );
  }

  // Summary indicators
  const totalDetections = data.total_detections || 0;
  const totalCrossings = data.total_crossings || 0;
  const uniqueObjects = data.unique_objects || 0;
  const averageAccuracy = Math.round(data.average_accuracy * 100) || 0;
  const mostCommonClass = data.class_frequency?.[0]?.class_name || 'None';

  // Formatting class frequency data for Recharts BarChart & PieChart
  const chartData = data.class_frequency?.map(item => ({
    name: item.class_name.toUpperCase(),
    value: item.count,
    Detections: item.count,
    Confidence: Math.round(item.avg_confidence * 100)
  })) || [];

  const areaChartData = data.hourly_timeline?.map(item => ({
    hour: item.hour,
    Detections: item.count
  })) || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-brand-border pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">System Analytics</h2>
          <p className="text-slate-400 text-sm mt-1">Telemetry summaries, spatial coordinates density maps, and model trends</p>
        </div>
        <button 
          onClick={fetchAnalytics}
          className="glass-panel border border-brand-border hover:bg-white/5 text-slate-200 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-colors text-sm"
        >
          <RefreshCw className="w-4.5 h-4.5" /> Refresh Analytics
        </button>
      </div>

      {/* Summary Analytics Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Total Detections */}
        <div className="glass-panel rounded-2xl p-5 border border-brand-border flex items-center gap-4 hover:border-brand-glow/20 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-brand-glow/10 text-brand-glow flex items-center justify-center shrink-0 border border-brand-glow/10">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Detections</span>
            <span className="text-2xl font-black text-white leading-none tracking-tight block mt-1">{totalDetections}</span>
          </div>
        </div>

        {/* Unique tracked objects */}
        <div className="glass-panel rounded-2xl p-5 border border-brand-border flex items-center gap-4 hover:border-brand-purple/20 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-brand-purple/10 text-brand-purple flex items-center justify-center shrink-0 border border-brand-purple/10">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Unique Tracked</span>
            <span className="text-2xl font-black text-white leading-none tracking-tight block mt-1">{uniqueObjects}</span>
          </div>
        </div>

        {/* Line Crossings */}
        <div className="glass-panel rounded-2xl p-5 border border-brand-border flex items-center gap-4 hover:border-rose-500/20 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/10">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Line Crossings</span>
            <span className="text-2xl font-black text-white leading-none tracking-tight block mt-1 capitalize">{totalCrossings}</span>
          </div>
        </div>

        {/* Model Accuracy (Mean Confidence) */}
        <div className="glass-panel rounded-2xl p-5 border border-brand-border flex items-center gap-4 hover:border-emerald-500/20 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/10">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Mean Accuracy</span>
            <span className="text-2xl font-black text-white leading-none tracking-tight block mt-1">{averageAccuracy}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Line & Bar charts */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Chart 1: Activity Timeline Area Chart */}
          <div className="glass-panel rounded-3xl p-6 border border-brand-border flex flex-col gap-4">
            <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-brand-glow" /> Operational Load Timeline (24h)
            </h3>
            <div className="h-60 w-full">
              {areaChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDetections" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="hour" stroke="#64748b" style={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                    <Area type="monotone" dataKey="Detections" stroke="#00f2fe" strokeWidth={2} fillOpacity={1} fill="url(#colorDetections)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">No timeline logs found in database.</div>
              )}
            </div>
          </div>

          {/* Chart 2: Recharts Pie & Bar Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bar chart */}
            <div className="glass-panel rounded-3xl p-5 border border-brand-border flex flex-col gap-4">
              <h4 className="font-bold text-white text-xs tracking-tight flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-purple" /> Class Breakdown
              </h4>
              <div className="h-52 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                      <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 9 }} />
                      <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0a0f1d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }} />
                      <Bar dataKey="Detections" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">No records.</div>
                )}
              </div>
            </div>

            {/* Pie chart */}
            <div className="glass-panel rounded-3xl p-5 border border-brand-border flex flex-col gap-4">
              <h4 className="font-bold text-white text-xs tracking-tight flex items-center gap-2">
                <Sliders className="w-4 h-4 text-rose-400" /> Share Ratio
              </h4>
              <div className="h-52 w-full flex items-center justify-center">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0a0f1d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">No records.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Heatmap and AI Insights */}
        <div className="flex flex-col gap-6">
          {/* Spatial Heatmap */}
          <div className="glass-panel rounded-3xl p-6 border border-brand-border flex flex-col gap-4">
            <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
              <Map className="w-4.5 h-4.5 text-brand-purple" /> Spatial Heatmap
            </h3>
            
            <div className="relative aspect-video rounded-2xl border border-brand-border overflow-hidden bg-black flex items-center justify-center">
              <img 
                src={`http://${hostname}:8000/api/heatmap?t=${heatmapKey}`} 
                alt="Coordinates Heatmap"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed text-center italic">
              Spatial map aggregating camera pixel coordinate occurrences of tracked object centers.
            </p>
          </div>

          {/* AI Insights Card */}
          <div className="glass-panel rounded-3xl p-6 border border-brand-border flex flex-col gap-4 flex-1">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-brand-border pb-3">
              <Sparkles className="w-4.5 h-4.5 text-brand-glow animate-pulse" />
              <span>AI Analytical Insights</span>
            </div>

            <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[280px] pr-1">
              {insights.map((insight, idx) => (
                <div key={idx} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                  <span className="text-brand-glow font-bold shrink-0">•</span>
                  <p dangerouslySetInnerHTML={{ __html: insight }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
