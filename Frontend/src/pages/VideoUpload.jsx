import React, { useState } from 'react';
import axios from 'axios';
import { 
  Upload, 
  FileVideo, 
  Settings, 
  AlertCircle, 
  Play, 
  Download,
  Info,
  Sliders,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoUpload() {
  const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0); // 0 to 100
  const [liveStats, setLiveStats] = useState({ total_detections: 0, crossed_count: 0 });
  const [result, setResult] = useState(null);

  // Form params
  const [confThreshold, setConfThreshold] = useState(0.25);
  const [classesInput, setClassesInput] = useState('person, car, truck, bicycle');
  const [linePosition, setLinePosition] = useState(0.5);
  const [lineOrientation, setLineOrientation] = useState('horizontal');

  // Handle drag options
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragOver(true);
    } else if (e.type === 'dragleave') {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'video/mp4') {
        setFile(droppedFile);
        setResult(null);
      } else {
        alert('Please drop an MP4 video file.');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  // Upload and process video
  const processVideo = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conf_threshold', confThreshold);
    formData.append('classes', classesInput);
    formData.append('line_position', linePosition);
    formData.append('line_orientation', lineOrientation);

    setIsProcessing(true);
    setStatusMessage('Uploading video to FastAPI server...');
    setProgress(0);
    setLiveStats({ total_detections: 0, crossed_count: 0 });
    setResult(null);

    try {
      const response = await axios.post(`http://${hostname}:8000/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { task_id } = response.data;
      setStatusMessage('Video queued on backend pipeline...');

      // Polling interval
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await axios.get(`http://${hostname}:8000/api/upload/status/${task_id}`);
          const data = statusRes.data;
          
          if (data.status === 'processing') {
            setProgress(data.percentage);
            setLiveStats({
              total_detections: data.total_detections,
              crossed_count: data.crossed_count
            });
            setStatusMessage(`Evaluating frame logs: ${data.percentage}%`);
          } else if (data.status === 'completed') {
            clearInterval(pollInterval);
            setProgress(100);
            setResult(data);
            setIsProcessing(false);
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setIsProcessing(false);
            alert(`Processing failed: ${data.error}`);
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
        }
      }, 500);

    } catch (err) {
      console.error(err);
      alert('Error uploading video. Make sure backend is running.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Title */}
      <div className="border-b border-brand-border pb-4">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Video File Processing</h2>
        <p className="text-slate-400 text-sm mt-1">Upload footages to run tracking and line-crossing filters asynchronously</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Drag/Drop and Player */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!result && !isProcessing && (
            /* Drag and Drop Box */
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`glass-panel border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                isDragOver ? 'border-brand-glow bg-brand-glow/5 scale-[1.01]' : 'border-brand-border hover:border-slate-700'
              }`}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input 
                id="file-input"
                type="file"
                accept="video/mp4"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-brand-border flex items-center justify-center text-slate-400 mb-4 group-hover:scale-105 transition-transform">
                <Upload className="w-8 h-8 text-brand-glow" />
              </div>
              <h3 className="font-bold text-white text-lg tracking-tight mb-2">Drag and drop MP4 video</h3>
              <p className="text-slate-400 text-xs max-w-sm mb-4">Supported formats: .mp4 files. Max file size: 50MB for responsive CPU evaluations.</p>
              
              {file && (
                <div className="px-4 py-2 rounded-xl bg-slate-900 border border-brand-border flex items-center gap-2 text-sm text-slate-200">
                  <FileVideo className="w-4.5 h-4.5 text-brand-purple" />
                  <span className="font-semibold">{file.name}</span>
                  <span className="text-[10px] text-slate-500 font-medium">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
              )}
            </div>
          )}

          {/* Processing Loading Panel */}
          {isProcessing && (
            <div className="glass-panel rounded-3xl p-12 flex flex-col items-center justify-center text-center border border-brand-border min-h-[350px]">
              <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                {/* Spinning glow loops */}
                <div className="absolute inset-0 rounded-full border-4 border-brand-glow/10 border-t-brand-glow animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-brand-purple/10 border-b-brand-purple animate-spin-slow" />
                <Sparkles className="w-7 h-7 text-brand-glow animate-pulse" />
              </div>
              <h3 className="font-extrabold text-white text-xl tracking-tight mb-2">AI Processing Active</h3>
              <p className="text-slate-300 text-sm max-w-md animate-pulse mb-6">{statusMessage}</p>
              
              {/* Glowing progress bar */}
              <div className="w-full max-w-md bg-slate-950 border border-brand-border/40 h-4.5 rounded-full overflow-hidden mb-6 p-0.5">
                <div 
                  className="bg-gradient-to-r from-brand-purple to-brand-glow h-full rounded-full transition-all duration-300 shadow-neon-cyan flex items-center justify-end pr-2"
                  style={{ width: `${progress}%` }}
                >
                  <span className="text-[8px] font-black text-brand-bg leading-none">{progress}%</span>
                </div>
              </div>

              {/* Running telemetry logs counters */}
              <div className="flex gap-8 justify-center text-xs">
                <div className="flex flex-col">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Unique Tracked</span>
                  <span className="text-lg font-bold text-brand-purple mt-1">{liveStats.total_detections}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Crossings</span>
                  <span className="text-lg font-bold text-rose-400 mt-1">{liveStats.crossed_count}</span>
                </div>
              </div>
            </div>
          )}

          {/* Results Visualizer */}
          {result && (
            <div className="flex flex-col gap-4">
              <div className="relative glass-panel rounded-3xl overflow-hidden aspect-video border border-brand-border bg-black flex items-center justify-center">
                <video 
                  controls 
                  src={`http://${hostname}:8000${result.video_url}`}
                  className="w-full h-full object-contain"
                  autoPlay
                />
              </div>

              {/* Result Summary Bar */}
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-2xl border border-brand-border">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Processing Status</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block">COMPLETE</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-brand-border">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Unique Objects</span>
                  <span className="text-lg font-bold text-brand-purple mt-1 block">{result.total_detections}</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-brand-border">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Counting Line Cuts</span>
                  <span className="text-lg font-bold text-rose-400 mt-1 block">{result.crossed_count}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-1 justify-end">
                <button 
                  onClick={() => { setFile(null); setResult(null); }}
                  className="glass-panel border border-brand-border hover:bg-white/5 text-slate-200 font-semibold px-5 py-2.5 rounded-xl cursor-pointer transition-colors text-sm"
                >
                  Upload Another Video
                </button>
                <a 
                  href={`http://${hostname}:8000${result.video_url}`}
                  download
                  className="btn-neon-cyan px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer text-sm"
                >
                  <Download className="w-4.5 h-4.5" /> Download Processed MP4
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Parameters and Filters */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 flex flex-col gap-6 border border-brand-border">
            <div className="flex items-center gap-2 text-white font-bold text-base border-b border-brand-border pb-3">
              <Settings className="w-5 h-5 text-brand-glow" />
              <span>Video Settings</span>
            </div>

            {/* Confidence cutoff */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">Model Confidence</span>
                <span className="text-brand-glow font-bold">{Math.round(confThreshold * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.10" 
                max="0.90" 
                step="0.05" 
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-glow"
              />
            </div>

            {/* Classes text input */}
            <div className="flex flex-col gap-2">
              <span className="text-slate-300 text-sm font-medium">Target Classes (comma separated)</span>
              <input 
                type="text"
                value={classesInput}
                onChange={(e) => setClassesInput(e.target.value)}
                placeholder="person, car, dog..."
                className="glass-input px-3.5 py-2.5 rounded-xl text-xs w-full mt-1 font-semibold"
              />
              <span className="text-[10px] text-slate-500 italic mt-0.5 leading-relaxed">COCO labels: person, bicycle, car, motorcycle, bus, truck, dog, cat, backpack, suitcase, umbrella, cell phone.</span>
            </div>

            {/* Line offset */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">Counting Line Offset</span>
                <span className="text-rose-400 font-bold">{Math.round(linePosition * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.10" 
                max="0.90" 
                step="0.02" 
                value={linePosition}
                onChange={(e) => setLinePosition(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>

            {/* Line orientation choice */}
            <div className="flex flex-col gap-2">
              <span className="text-slate-300 text-sm font-medium">Counting Line Orientation</span>
              <div className="flex gap-2 mt-1">
                {['horizontal', 'vertical'].map((orient) => (
                  <button
                    key={orient}
                    onClick={() => setLineOrientation(orient)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer capitalize ${
                      lineOrientation === orient
                        ? 'border-brand-glow bg-brand-glow/10 text-brand-glow'
                        : 'border-brand-border hover:bg-white/5 text-slate-400'
                    }`}
                  >
                    {orient}
                  </button>
                ))}
              </div>
            </div>
            
            <button 
              onClick={processVideo}
              disabled={!file || isProcessing}
              className={`w-full py-3.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer ${
                file && !isProcessing
                  ? 'btn-neon-purple text-white shadow-neon-purple'
                  : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-white" /> Evaluate & Track Footage
            </button>
          </div>

          {/* AI Info Tip Box */}
          <div className="glass-panel border border-brand-border rounded-3xl p-5 flex gap-3 text-xs leading-relaxed text-slate-400">
            <Info className="w-5 h-5 text-brand-glow shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block mb-1">Server Rendering Tip</span>
              The video is evaluated frame-by-frame on the Python backend. For the fastest response, upload video files under 15 seconds in duration.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
