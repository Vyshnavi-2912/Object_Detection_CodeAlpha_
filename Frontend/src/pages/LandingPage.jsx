import React from 'react';
import { 
  Camera, 
  Upload, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  ArrowRight,
  Database,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage({ setActiveTab }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  };

  const stats = [
    { label: 'Object Detector', val: 'YOLOv8n', desc: '80 Class COCO Model', icon: Cpu, color: 'text-brand-glow bg-brand-glow/10' },
    { label: 'Object Tracker', val: 'IOU-Centroid', desc: 'Real-time state prediction', icon: TrendingUp, color: 'text-brand-purple bg-brand-purple/10' },
    { label: 'Storage', val: 'SQLite DB', desc: 'Structured logs recording', icon: Database, color: 'text-amber-400 bg-amber-400/10' },
    { label: 'Analytics Output', val: 'PDF & CSV', desc: 'ReportLab document engine', icon: FileSpreadsheet, color: 'text-emerald-400 bg-emerald-400/10' }
  ];

  const features = [
    {
      title: 'Real-Time Webcam Streaming',
      desc: 'Connect your local camera to stream compressed frames over high-speed WebSockets. Tracks coordinates, classes, and overlays trails in real-time at 30+ FPS.',
      icon: Camera
    },
    {
      title: 'Video Upload Processing',
      desc: 'Drag and drop standard MP4 footage. The server processes frames sequentially, compiles coordinates, draw bounding box details, and renders a web-friendly MP4.',
      icon: Upload
    },
    {
      title: 'Intelligent Counting Zones',
      desc: 'Configure custom lines dynamically on screen. Count cars, pedestrians, or animals as their trajectory cuts through horizontal or vertical boundaries.',
      icon: ShieldCheck
    }
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-12"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="text-center flex flex-col items-center gap-6 py-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel text-xs text-brand-glow border border-brand-glow/20 font-semibold tracking-wider uppercase">
          <Cpu className="w-4 h-4 animate-spin-slow" /> Edge Computer Vision System
        </div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl text-white font-sans">
          Real-Time Object Detection &{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-glow to-brand-purple">
            Trajectory Tracking
          </span>
        </h1>
        
        <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
          An industrial-grade SaaS Vision Suite utilizing YOLOv8 and IOU centroid matching to detect, track, count, and log items with modern glassmorphism dashboards.
        </p>

        <div className="flex gap-4 mt-2">
          <button 
            onClick={() => setActiveTab('webcam')}
            className="btn-neon-cyan px-8 py-3.5 rounded-xl flex items-center gap-2 group cursor-pointer"
          >
            <span>Start Live Webcam</span>
            <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
          
          <button 
            onClick={() => setActiveTab('video')}
            className="glass-panel border border-brand-border hover:bg-white/5 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 cursor-pointer"
          >
            Process Video file
          </button>
        </div>
      </motion.div>

      {/* Tech Spec Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="glass-panel rounded-2xl p-5 flex flex-col gap-4 border border-brand-border">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{s.label}</span>
                <div className={`p-2 rounded-xl ${s.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">{s.val}</div>
                <div className="text-xs text-slate-500 mt-1">{s.desc}</div>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Main Features Segment */}
      <motion.div variants={itemVariants} className="flex flex-col gap-8">
        <h2 className="text-2xl font-bold text-white tracking-tight border-b border-brand-border pb-3">
          Core Capabilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div key={idx} className="glass-panel rounded-2xl p-6 flex flex-col gap-4 hover:border-brand-glow/20 transition-colors duration-300">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-purple/20 to-brand-glow/10 flex items-center justify-center border border-brand-glow/10 text-brand-glow">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg tracking-tight mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
