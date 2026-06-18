import os
import cv2
import numpy as np
import base64
import time
import shutil
import tempfile
import json
import subprocess
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, Form, Query, HTTPException, Response, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.detector import YOLODetector
from app.tracker import Tracker
from app.database import add_detection_log, query_logs, get_analytics_summary, clear_logs, SessionLocal
from app.export import generate_csv_report, generate_pdf_report

# Initialize FastAPI
app = FastAPI(title="AuraTrack AI API", description="FastAPI Server for AI Object Detection and Tracking")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup directories for static files (processed videos and screenshots)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")
VIDEOS_DIR = os.path.join(STATIC_DIR, "videos")
os.makedirs(VIDEOS_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Shared YOLO Detector instance (loaded once on startup)
detector = None

# Thread-safe dictionary to track background video processing jobs
video_jobs = {}

# Helper function to decode base64 images
def decode_base64_image(base64_string: str) -> np.ndarray:
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    image_bytes = base64.b64decode(base64_string)
    np_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    return image

# Check line crossing utility
def check_crossing(p1, p2, line_coord, orientation="horizontal"):
    """
    Check if a line segment between points p1 and p2 crosses a horizontal or vertical threshold.
    """
    if orientation == "horizontal":
        y1, y2 = p1[1], p2[1]
        return (y1 < line_coord <= y2) or (y2 < line_coord <= y1)
    else:
        x1, x2 = p1[0], p2[0]
        return (x1 < line_coord <= x2) or (x2 < line_coord <= x1)

# Helper function to draw premium AI Surveillance HUD on OpenCV frames
def draw_hud_box(frame, bbox, track_id, class_name, confidence, trajectory, color):
    x1, y1, x2, y2 = bbox
    w = x2 - x1
    h = y2 - y1
    cx = int((x1 + x2) / 2)
    cy = int((y1 + y2) / 2)
    
    # 1. L-Shaped Corner Brackets (length = min(w, h, 15))
    length = min(w, h, 15)
    thickness = 2
    
    # Top-Left Corner
    cv2.line(frame, (x1, y1), (x1 + length, y1), color, thickness)
    cv2.line(frame, (x1, y1), (x1, y1 + length), color, thickness)
    
    # Top-Right Corner
    cv2.line(frame, (x2, y1), (x2 - length, y1), color, thickness)
    cv2.line(frame, (x2, y1), (x2, y1 + length), color, thickness)
    
    # Bottom-Left Corner
    cv2.line(frame, (x1, y2), (x1 + length, y2), color, thickness)
    cv2.line(frame, (x1, y2), (x1, y2 - length), color, thickness)
    
    # Bottom-Right Corner
    cv2.line(frame, (x2, y2), (x2 - length, y2), color, thickness)
    cv2.line(frame, (x2, y2), (x2, y2 - length), color, thickness)
    
    # 2. Dotted/Target Center Crosshair Marker
    cv2.circle(frame, (cx, cy), 2, color, -1)
    cv2.line(frame, (cx - 5, cy), (cx + 5, cy), color, 1)
    cv2.line(frame, (cx, cy - 5), (cx, cy + 5), color, 1)
    
    # 3. Label tag: High-tech text details card
    label = f"{class_name.upper()} | ID:{track_id:02d} | {int(confidence * 100)}%"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.4
    font_thickness = 1
    
    # Draw transparent black tag background
    (text_w, text_h), baseline = cv2.getTextSize(label, font, font_scale, font_thickness)
    cv2.rectangle(frame, (x1, y1 - text_h - 10), (x1 + text_w + 10, y1), (16, 22, 34), -1)
    cv2.rectangle(frame, (x1, y1 - text_h - 10), (x1 + text_w + 10, y1), color, 1)
    cv2.putText(frame, label, (x1 + 5, y1 - 5), font, font_scale, (255, 255, 255), font_thickness, cv2.LINE_AA)
    
    # 4. Trajectory Trails
    for pt in trajectory:
        cv2.circle(frame, (pt[0], pt[1]), 2, (124, 58, 237), -1)

# Asynchronous background video processing task function
def process_video_task(
    task_id: str,
    temp_path: str,
    output_path: str,
    web_output_path: str,
    conf_threshold: float,
    selected_classes: Optional[list],
    line_position: float,
    line_orientation: str,
    filename: str
):
    try:
        cap = cv2.VideoCapture(temp_path)
        if not cap.isOpened():
            raise ValueError("Could not open uploaded video file.")
            
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0 or np.isnan(fps):
            fps = 24.0
            
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            total_frames = 1
            
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
        
        tracker = Tracker()
        logged_ids = set()
        crossed_ids = set()
        crossed_count = 0
        total_unique_count = 0
        
        # Calculate line position in pixels
        if line_orientation == "horizontal":
            line_coord = int(frame_height * line_position)
        else:
            line_coord = int(frame_width * line_position)
            
        frame_index = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            frame_index += 1
            
            # Detect
            detections = detector.detect(frame, conf_threshold=conf_threshold, selected_classes=selected_classes)
            # Track
            tracks = tracker.update(detections)
            
            # Render line on frame
            line_color = (239, 68, 68) # Bright Red
            if line_orientation == "horizontal":
                cv2.line(frame, (0, line_coord), (frame_width, line_coord), line_color, 2)
                cv2.putText(frame, "COUNTING LINE", (10, line_coord - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, line_color, 1)
            else:
                cv2.line(frame, (line_coord, 0), (line_coord, frame_height), line_color, 2)
                cv2.putText(frame, "COUNTING LINE", (line_coord + 10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, line_color, 1)

            for track in tracks:
                track_id = track["track_id"]
                bbox = track["bbox"]
                class_name = track["class_name"]
                conf = track["confidence"]
                trajectory = track["trajectory"]
                
                # Check for line crossing
                if len(trajectory) >= 2:
                    p1 = trajectory[-2]
                    p2 = trajectory[-1]
                    if check_crossing(p1, p2, line_coord, line_orientation):
                        if track_id not in crossed_ids:
                            crossed_ids.add(track_id)
                            crossed_count += 1
                            # Log crossing event to DB
                            add_detection_log(track_id, class_name, conf, source=filename, bbox=bbox, event_type="crossing")
                            
                # DB logging for unique objects
                if track_id not in logged_ids:
                    logged_ids.add(track_id)
                    total_unique_count += 1
                    # Save standard detection log to DB
                    add_detection_log(track_id, class_name, conf, source=filename, bbox=bbox, event_type="detection")
                
                # Draw high-tech HUD box
                hud_color = (0, 242, 254) if class_name == "person" else (124, 58, 237) # Cyan vs Violet
                draw_hud_box(frame, bbox, track_id, class_name, conf, trajectory, hud_color)

            # Render HUD Dashboard overlay on top left
            cv2.rectangle(frame, (15, 15), (280, 95), (10, 15, 29), -1)
            cv2.rectangle(frame, (15, 15), (280, 95), (0, 242, 254), 1)
            cv2.putText(frame, "AURATRACK HUD PROCESSOR", (25, 33), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
            cv2.putText(frame, f"Unique Tracked: {total_unique_count}", (25, 53), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (148, 163, 184), 1, cv2.LINE_AA)
            cv2.putText(frame, f"Counting Zone: {crossed_count}", (25, 73), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 242, 254), 1, cv2.LINE_AA)

            writer.write(frame)
            
            # Update background progress state (throttle logging slightly if needed)
            progress_ratio = frame_index / total_frames
            video_jobs[task_id] = {
                "status": "processing",
                "progress": progress_ratio,
                "percentage": int(progress_ratio * 100),
                "total_detections": total_unique_count,
                "crossed_count": crossed_count
            }
            
        cap.release()
        writer.release()
        os.remove(temp_path)
        
        # Convert video to H264 container format via ffmpeg
        try:
            cmd = f'ffmpeg -y -i "{output_path}" -vcodec libx264 -preset fast -pix_fmt yuv420p "{web_output_path}"'
            subprocess.run(cmd, shell=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            os.remove(output_path)
            serve_filename = os.path.basename(web_output_path)
        except Exception as ffmpeg_err:
            print(f"FFmpeg H264 conversion failed, falling back. Error: {ffmpeg_err}")
            serve_filename = os.path.basename(output_path)
            
        # Complete state
        video_jobs[task_id] = {
            "status": "completed",
            "progress": 1.0,
            "percentage": 100,
            "video_url": f"/static/videos/{serve_filename}",
            "total_detections": total_unique_count,
            "crossed_count": crossed_count
        }
    except Exception as e:
        print(f"Background video thread error: {e}")
        video_jobs[task_id] = {
            "status": "failed",
            "progress": 0.0,
            "percentage": 0,
            "error": str(e)
        }

@app.get("/api/health")
def get_health_check():
    """
    Exposes live indicators status (ONLINE/OFFLINE) with database and YOLO engine diagnostics.
    """
    try:
        db_status = "online"
        yolo_status = "offline" if detector is  None else "online"
        
        # Verify SQLite connection
        try:
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
        except Exception:
            db_status = "offline"
            
        return {
            "success": True,
            "status": "healthy",
            "backend": "online",
            "database": db_status,
            "yolo": yolo_status,
            "api": "online"
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/analytics")
def get_analytics():
    try:
        summary = get_analytics_summary()
        return JSONResponse(content={"success": True, **summary})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/logs")
def get_logs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    class_filter: Optional[str] = Query(None),
    source_filter: Optional[str] = Query(None),
    event_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("timestamp"),
    sort_order: str = Query("desc")
):
    try:
        data = query_logs(
            limit=limit, 
            offset=offset, 
            class_filter=class_filter, 
            source_filter=source_filter, 
            event_filter=event_filter,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order
        )
        return JSONResponse(content={"success": True, **data})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.delete("/api/logs/clear")
def delete_logs():
    try:
        clear_logs()
        return JSONResponse(content={"success": True, "message": "Database cleared successfully."})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/export/csv")
def export_csv():
    try:
        logs_data = query_logs(limit=10000)
        csv_content = generate_csv_report(logs_data.get("logs", []))
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=auratrack_export.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export/pdf")
def export_pdf():
    try:
        summary = get_analytics_summary()
        logs_data = query_logs(limit=1000)
        pdf_bytes = generate_pdf_report(summary, logs_data.get("logs", []))
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=auratrack_report.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/insights")
def get_ai_insights():
    try:
        summary = get_analytics_summary()
        total = summary.get("total_detections", 0)
        
        if total == 0:
            return JSONResponse(content={
                "success": True,
                "insights": [
                    "No tracking data available yet. Start your live stream or upload video footage to generate insights.",
                    "The system will automatically log occurrences, identify peak hours, and highlight anomalous classes."
                ]
            })
            
        freqs = summary.get("class_frequency", [])
        timeline = summary.get("hourly_timeline", [])
        
        insights = []
        if freqs:
            top_class = freqs[0]['class_name']
            top_percentage = int((freqs[0]['count'] / total) * 100) if total > 0 else 0
            insights.append(f"Dominant Object: **{top_class.capitalize()}** represents **{top_percentage}%** of all tracked objects, signaling high density.")
        
        if timeline:
            peak_hour = max(timeline, key=lambda x: x['count'])
            insights.append(f"Peak Operational Traffic: Maximum detection frequency recorded at **{peak_hour['hour']}** with **{peak_hour['count']}** item events.")
        
        avg_conf = summary.get("average_accuracy", 0.0)
        if avg_conf > 0:
            insights.append(f"System Reliability: YOLOv8 model tracking runs with an average confidence level of **{int(avg_conf * 100)}%**.")
            
        insights.append(f"Continuous Monitoring: Database contains **{total}** items tracked across multiple sources, ready for export.")
        
        return JSONResponse(content={"success": True, "insights": insights})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/heatmap")
def get_heatmap_image():
    try:
        logs_data = query_logs(limit=1000)
        logs = logs_data.get("logs", [])
        
        width, height = 640, 480
        mask = np.zeros((height, width), dtype=np.float32)
        
        count = 0
        for log in logs:
            bbox = log.get("bbox")
            if bbox and None not in bbox:
                x1, y1, x2, y2 = bbox
                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)
                
                if 0 <= cx < width and 0 <= cy < height:
                    mask[cy, cx] += 1.0
                    count += 1
        
        if count > 0:
            mask = cv2.GaussianBlur(mask, (31, 31), 0)
            cv2.normalize(mask, mask, 0, 255, cv2.NORM_MINMAX)
            mask = mask.astype(np.uint8)
            heatmap = cv2.applyColorMap(mask, cv2.COLORMAP_JET)
        else:
            heatmap = np.zeros((height, width, 3), dtype=np.uint8)
            cv2.putText(heatmap, "No coordinate logs found", (150, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (148, 163, 184), 2)
            
        _, img_encoded = cv2.imencode('.jpg', heatmap)
        return Response(content=img_encoded.tobytes(), media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    conf_threshold: float = Form(0.25),
    classes: Optional[str] = Form(None), # Comma separated list of classes
    line_position: float = Form(0.5),
    line_orientation: str = Form("horizontal")
):
    """
    Submits a video file for background processing, preventing socket timeout blocks.
    """
    try:
        # Validate format
        if not file.filename.endswith('.mp4'):
            raise HTTPException(status_code=400, detail="Only MP4 video container formats are supported.")
            
        selected_classes = [c.strip() for c in classes.split(",")] if classes else None
        
        # Save temp video file
        temp_fd, temp_path = tempfile.mkstemp(suffix=".mp4")
        os.close(temp_fd)
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Prepare output names
        task_id = f"job_{int(time.time() * 1000)}"
        output_filename = f"processed_{task_id}.mp4"
        output_path = os.path.join(VIDEOS_DIR, output_filename)
        
        web_output_filename = f"web_{output_filename}"
        web_output_path = os.path.join(VIDEOS_DIR, web_output_filename)
        
        # Initialize background jobs status
        video_jobs[task_id] = {
            "status": "processing",
            "progress": 0.0,
            "percentage": 0,
            "total_detections": 0,
            "crossed_count": 0
        }
        
        # Add background thread execution
        background_tasks.add_task(
            process_video_task,
            task_id,
            temp_path,
            output_path,
            web_output_path,
            conf_threshold,
            selected_classes,
            line_position,
            line_orientation,
            file.filename
        )
        
        return JSONResponse(content={
            "success": True,
            "task_id": task_id,
            "message": "Video submitted successfully for model evaluations."
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/upload/status/{task_id}")
def get_video_status(task_id: str):
    """
    Poll endpoint returning current video parsing frame progress and statistics.
    """
    job = video_jobs.get(task_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job task identifier not found.")
    return JSONResponse(content={"success": True, **job})

@app.websocket("/api/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    
    # Initialize session specific states
    tracker = Tracker()
    logged_ids = set()
    crossed_ids = set()
    crossed_count = 0
    total_unique_count = 0
    
    try:
        while True:
            # Receive text/JSON data from frontend client
            data_str = await websocket.receive_text()
            data = None
            try:
                import json
                data = json.loads(data_str)
            except Exception:
                continue
                
            image_b64 = data.get("image")
            if not image_b64:
                continue
                
            conf_threshold = float(data.get("conf_threshold", 0.25))
            classes = data.get("selected_classes", None) # List of classes
            line_position = float(data.get("line_position", 0.5))
            line_orientation = data.get("line_orientation", "horizontal")
            
            # Decode frame
            frame = decode_base64_image(image_b64)
            if frame is None:
                continue
                
            height, width, _ = frame.shape
            
            # Start timer for processing speed calculation
            start_time = time.time()
            
            # Run inference
            detections = detector.detect(frame, conf_threshold=conf_threshold, selected_classes=classes)
            
            # Update tracking states
            tracks = tracker.update(detections)
            
            # Line coordinate calculation
            if line_orientation == "horizontal":
                line_coord = int(height * line_position)
            else:
                line_coord = int(width * line_position)
                
            # Line crossing counting logic
            for track in tracks:
                t_id = track["track_id"]
                traj = track["trajectory"]
                c_name = track["class_name"]
                conf = track["confidence"]
                bbox = track["bbox"]
                
                # Check boundary crossing
                if len(traj) >= 2:
                    p1 = traj[-2]
                    p2 = traj[-1]
                    if check_crossing(p1, p2, line_coord, line_orientation):
                        if t_id not in crossed_ids:
                            crossed_ids.add(t_id)
                            crossed_count += 1
                            # Write line-crossing event to DB
                            add_detection_log(t_id, c_name, conf, source="live", bbox=bbox, event_type="crossing")
                            
                # DB logging for unique objects seen
                if t_id not in logged_ids:
                    logged_ids.add(t_id)
                    total_unique_count += 1
                    # Write first-detection event to DB
                    add_detection_log(t_id, c_name, conf, source="live", bbox=bbox, event_type="detection")
            
            # FPS calculation
            process_time = time.time() - start_time
            fps = 1.0 / process_time if process_time > 0 else 30.0
            
            # Respond to client
            await websocket.send_json({
                "tracks": tracks,
                "fps": round(fps, 1),
                "total_unique": total_unique_count,
                "crossed_count": crossed_count
            })
            
    except WebSocketDisconnect:
        print("WebSocket stream disconnected.")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass
