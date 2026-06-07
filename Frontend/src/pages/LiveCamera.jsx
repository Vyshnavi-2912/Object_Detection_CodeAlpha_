import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Camera as CameraIcon, 
  Sliders, 
  CheckSquare, 
  ChevronRight,
  Shield,
  Activity,
  Layers
} from 'lucide-react';
import { motion } from 'framer-motion';

// Common YOLO classes for selection
const POPULAR_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'bus', 
  'train', 'truck', 'traffic light', 'fire hydrant', 'stop sign',
  'cat', 'dog', 'horse', 'sheep', 'cow', 'backpack', 'umbrella'
];

export default function LiveCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const latestTracksRef = useRef([]); // Hold tracks without trigger render loops

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [fps, setFps] = useState(0);
  const [totalUnique, setTotalUnique] = useState(0);
  const [crossedCount, setCrossedCount] = useState(0);
  const [activeDetectionsCount, setActiveDetectionsCount] = useState(0);

  // Settings
  const [confThreshold, setConfThreshold] = useState(0.35);
  const [selectedClasses, setSelectedClasses] = useState(['person', 'car']);
  const [linePosition, setLinePosition] = useState(0.5); // % of screen height/width
  const [lineOrientation, setLineOrientation] = useState('horizontal'); // horizontal or vertical

  // Start Webcam
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Camera access requires a Secure Context (HTTPS or localhost).\n\n• If you are on the host machine, please use:\n  http://localhost:5173/\n\n• If you are accessing this from a mobile/network device, go to:\n  chrome://flags/#unsafely-treat-insecure-origin-as-secure\n  and add 'http://" + window.location.hostname + ":5173' to the allowed origins.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: { ideal: 30 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Connect to Backend WebSocket
      const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
      const wsUrl = `ws://${hostname}:8000/api/stream`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket stream opened.");
        setIsStreaming(true);
      };

      ws.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data);
          latestTracksRef.current = result.tracks || [];
          setFps(result.fps || 0);
          setTotalUnique(result.total_unique || 0);
          setCrossedCount(result.crossed_count || 0);
          setActiveDetectionsCount(result.tracks ? result.tracks.length : 0);
        } catch (e) {
          console.error("Error parsing socket JSON: ", e);
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
      };

      ws.onclose = () => {
        console.log("WebSocket stream closed.");
        stopCamera();
      };

    } catch (err) {
      alert("Error starting camera. Please grant camera access and make sure backend is online.");
      console.error(err);
    }
  };

  // Stop Webcam
  const stopCamera = () => {
    setIsStreaming(false);
    
    // Stop Animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Stop tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    // Stop WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear Canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 640, 480);
      // Draw placeholder text
      ctx.fillStyle = '#64748b';
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Camera Offline. Click "Start Live Stream" to connect.', 320, 240);
    }
    
    setFps(0);
    latestTracksRef.current = [];
    setActiveDetectionsCount(0);
  };

  // Draw & Send Loops
  useEffect(() => {
    let lastSend = 0;

    const processLoop = (timestamp) => {
      if (!isStreaming) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // 1. Draw current video frame onto screen canvas
        ctx.drawImage(video, 0, 0, width, height);

        // 2. Format & Send Frame over WS (limit to ~15 FPS to prevent pipeline backing up)
        if (timestamp - lastSend > 66) { // 1000 / 15 FPS = 66ms
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // Downscale compression to JPEG for fast transport
            const base64Image = canvas.toDataURL('image/jpeg', 0.6);
            
            wsRef.current.send(JSON.stringify({
              image: base64Image,
              conf_threshold: confThreshold,
              selected_classes: selectedClasses,
              line_position: linePosition,
              line_orientation: lineOrientation
            }));
            
            lastSend = timestamp;
          }
        }

        // 3. Draw Counting Line
        const lineVal = lineOrientation === 'horizontal' ? height * linePosition : width * linePosition;
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ef4444'; // Bright Red
        
        if (lineOrientation === 'horizontal') {
          ctx.moveTo(0, lineVal);
          ctx.lineTo(width, lineVal);
        } else {
          ctx.moveTo(lineVal, 0);
          ctx.lineTo(lineVal, height);
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // Draw Line Text label
        ctx.fillStyle = '#ef4444';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'left';
        if (lineOrientation === 'horizontal') {
          ctx.fillText('COUNTING ZONE', 10, lineVal - 6);
        } else {
          ctx.fillText('COUNTING ZONE', lineVal + 6, 15);
        }

        // 4. Draw Premium AI Surveillance HUD Bounding Boxes on top
        const tracks = latestTracksRef.current;
        tracks.forEach(track => {
          const { track_id, bbox, class_name, confidence, trajectory } = track;
          const [x1, y1, x2, y2] = bbox;
          const w = x2 - x1;
          const h = y2 - y1;
          const cx = Math.round((x1 + x2) / 2);
          const cy = Math.round((y1 + y2) / 2);

          // Theme Color Map
          const accentColor = class_name === 'person' ? '#00f2fe' : '#7c3aed';
          
          // 4.1 Corner L-Brackets
          const len = Math.min(w, h, 12);
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 2.5;

          // Top-Left Corner
          ctx.beginPath();
          ctx.moveTo(x1 + len, y1);
          ctx.lineTo(x1, y1);
          ctx.lineTo(x1, y1 + len);
          ctx.stroke();

          // Top-Right Corner
          ctx.beginPath();
          ctx.moveTo(x2 - len, y1);
          ctx.lineTo(x2, y1);
          ctx.lineTo(x2, y1 + len);
          ctx.stroke();

          // Bottom-Left Corner
          ctx.beginPath();
          ctx.moveTo(x1, y2 - len);
          ctx.lineTo(x1, y2);
          ctx.lineTo(x1 + len, y2);
          ctx.stroke();

          // Bottom-Right Corner
          ctx.beginPath();
          ctx.moveTo(x2 - len, y2);
          ctx.lineTo(x2, y2);
          ctx.lineTo(x2, y2 - len);
          ctx.stroke();

          // 4.2 Radar Center Crosshair Target
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
          ctx.fillStyle = accentColor;
          ctx.fill();

          ctx.beginPath();
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1;
          ctx.moveTo(cx - 5, cy);
          ctx.lineTo(cx + 5, cy);
          ctx.moveTo(cx, cy - 5);
          ctx.lineTo(cx, cy + 5);
          ctx.stroke();

          // 4.3 Dotted Centroid Trail Points (fade with index alpha)
          if (trajectory && trajectory.length > 1) {
            trajectory.forEach((pt, i) => {
              const alpha = (i / trajectory.length) * 0.7; // fade trail points
              ctx.beginPath();
              ctx.arc(pt[0], pt[1], 2, 0, 2 * Math.PI);
              ctx.fillStyle = `rgba(167, 139, 250, ${alpha})`;
              ctx.fill();
            });

            // Smooth connecting dotted line
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.moveTo(trajectory[0][0], trajectory[0][1]);
            for (let i = 1; i < trajectory.length; i++) {
              ctx.lineTo(trajectory[i][0], trajectory[i][1]);
            }
            ctx.stroke();
            ctx.setLineDash([]); // reset
          }

          // 4.4 HUD Detail label text card
          const label = `${class_name.toUpperCase()} | ID:${track_id.toString().padStart(2, '0')} | ${Math.round(confidence * 100)}%`;
          ctx.font = 'bold 9px monospace';
          const textWidth = ctx.measureText(label).width;
          
          // Background rectangle
          ctx.fillStyle = 'rgba(10, 15, 29, 0.8)';
          ctx.fillRect(x1, y1 - 18, textWidth + 10, 18);
          
          // Glowing neon tag border
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(x1, y1 - 18, textWidth + 10, 18);
          
          // Draw text label
          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, x1 + 5, y1 - 6);
        });
      }

      animationFrameRef.current = requestAnimationFrame(processLoop);
    };

    if (isStreaming) {
      animationFrameRef.current = requestAnimationFrame(processLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isStreaming, confThreshold, selectedClasses, linePosition, lineOrientation]);

  // Clean stop on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Class selection toggles
  const handleClassToggle = (cls) => {
    setSelectedClasses(prev => 
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  // Capture Screenshot from Canvas
  const captureScreenshot = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg');
    const link = document.createElement('a');
    link.download = `auratrack_capture_${Date.now()}.jpg`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto px-4 py-8">
      {/* Page Title header */}
      <div className="flex items-center justify-between border-b border-brand-border pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Real-Time Object Detection</h2>
          <p className="text-slate-400 text-sm mt-1">Stream webcam footage via WebSockets for sub-100ms model evaluation</p>
        </div>
        <div className="flex items-center gap-3">
          {isStreaming ? (
            <button 
              onClick={stopCamera}
              className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Square className="w-4.5 h-4.5" /> Stop Stream
            </button>
          ) : (
            <button 
              onClick={startCamera}
              className="btn-neon-cyan px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4.5 h-4.5 fill-brand-bg text-brand-bg" /> Start Live Stream
            </button>
          )}

          <button 
            onClick={captureScreenshot}
            disabled={!isStreaming}
            className={`px-4 py-2.5 rounded-xl font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
              isStreaming 
                ? 'glass-panel border-brand-border text-white hover:bg-white/5' 
                : 'border-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CameraIcon className="w-4.5 h-4.5" /> Screenshot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Canvas Player */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative glass-panel rounded-3xl overflow-hidden aspect-video border border-brand-border flex items-center justify-center bg-[#090d16]">
            {/* Hidden video node for loading stream */}
            <video 
              ref={videoRef} 
              style={{ display: 'none' }} 
              playsInline 
              muted 
            />
            {/* Visual Canvas element */}
            <canvas 
              ref={canvasRef} 
              width="640" 
              height="480" 
              className="w-full h-full object-contain"
            />

            {/* Glowing online banner */}
            {isStreaming && (
              <div className="absolute top-4 left-4 bg-brand-bg/80 border border-brand-glow/20 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold tracking-wider text-brand-glow backdrop-blur-md">
                <span className="w-2.5 h-2.5 bg-brand-glow rounded-full animate-ping" />
                WS STREAMING
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl flex flex-col border border-brand-border">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stream FPS</span>
              <span className="text-2xl font-bold text-white mt-1">{fps}</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex flex-col border border-brand-border">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Screen Objects</span>
              <span className="text-2xl font-bold text-brand-glow mt-1">{activeDetectionsCount}</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex flex-col border border-brand-border">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unique Count</span>
              <span className="text-2xl font-bold text-brand-purple mt-1">{totalUnique}</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex flex-col border border-brand-border">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Crossed Line</span>
              <span className="text-2xl font-bold text-rose-400 mt-1">{crossedCount}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Parameters and Filters */}
        <div className="flex flex-col gap-6">
          {/* Slider configurations */}
          <div className="glass-panel rounded-3xl p-6 flex flex-col gap-6 border border-brand-border">
            <div className="flex items-center gap-2 text-white font-bold text-base border-b border-brand-border pb-3">
              <Sliders className="w-5 h-5 text-brand-glow" />
              <span>Model Parameters</span>
            </div>

            {/* Confidence Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">Confidence Cutoff</span>
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

            {/* Counting Line Slider */}
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

            {/* Orientation choice */}
            <div className="flex flex-col gap-2">
              <span className="text-slate-300 text-sm font-medium">Line Orientation</span>
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
          </div>

          {/* Class multi-select checklist */}
          <div className="glass-panel rounded-3xl p-6 flex flex-col gap-4 border border-brand-border flex-1">
            <div className="flex items-center gap-2 text-white font-bold text-base border-b border-brand-border pb-3">
              <CheckSquare className="w-5 h-5 text-brand-purple" />
              <span>Target Object Classes</span>
            </div>

            <div className="overflow-y-auto max-h-56 pr-2 flex flex-col gap-1.5">
              {POPULAR_CLASSES.map((cls) => {
                const isChecked = selectedClasses.includes(cls);
                return (
                  <label 
                    key={cls}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer border transition-colors ${
                      isChecked 
                        ? 'bg-brand-purple/10 border-brand-purple/35 text-white' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="capitalize">{cls}</span>
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleClassToggle(cls)}
                      className="w-4 h-4 rounded text-brand-purple focus:ring-brand-purple bg-brand-bg border-brand-border accent-brand-purple"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
