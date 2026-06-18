# AuraTrack.AI - AI Object Detection & Trajectory Tracking Suite
#live demo 
Frontend:https://object-detection-codealpha-1.onrender.com

AuraTrack.AI is a complete, production-ready, SaaS-style AI Object Detection and Multi-Object Tracking web application. Engineered as an internship-winning portfolio project, it delivers real-time webcam telemetry analysis via high-speed WebSockets and asynchronous video file processing.

---

## ━━━━━━━━━━━━━━━━━━━━━━━
## 1. PROJECT EXPLANATION & ARCHITECTURE
## ━━━━━━━━━━━━━━━━━━━━━━━

AuraTrack.AI is designed with a decoupled Client-Server architecture tailored for high-frequency frame operations:

```
  ┌────────────────────────────────────────────────────────┐
  │                   React.js Frontend                    │
  │     (Captures frames, renders Canvas Overlay, trails)  │
  └───────────┬───────────────────────────────▲────────────┘
              │                               │
    HTTP POST │ Video Uploads       Websocket │ Tracks JSON
   (Multipart)│                      (Base64) │ (Coordinates)
              ▼                               │
  ┌───────────┴───────────────────────────────┴────────────┐
  │                    FastAPI Backend                     │
  │     (Loads YOLOv8, runs tracker, processes queues)     │
  └───────────┬───────────────────────────────▲────────────┘
              │                               │
   SQLAlchemy │ Write Detections       SQLite │ Fetch Stats
              ▼                               │
  ┌───────────────────────────────────────────┴────────────┐
  │                   SQLite Database                      │
  │           (Logs track history & centroids)             │
  └────────────────────────────────────────────────────────┘
```

### Core Technologies:
1. **YOLOv8 Object Detector (Ultralytics)**: Loads the lightweight `yolov8n.pt` model trained on 80 class COCO targets. Runs inference inside the FastAPI request loops.
2. **Custom IOU-Centroid Tracker**: Calculates Intersect-over-Union (IOU) cost matrices between sequential frames and assigns stable tracking IDs using the Hungarian Algorithm (`linear_sum_assignment`). Maintains a historical trajectory buffer of centroids for line-crossing counts.
3. **FastAPI WebSockets**: Establishes a persistent TCP pipeline with the browser to stream frames. Processes and returns frame analytics under 50ms (CPU).
4. **HTML5 Canvas Drawing Engine**: Bypasses the network overhead of sending processed binary images back to the browser. Instead, the frontend draws bounding boxes, confidence tags, and glowing motion trails directly over the raw webcam layout.
5. **SQLite + SQLAlchemy ORM**: Persists log items (Timestamp, Track ID, Class Name, Confidence, Coordinates, Source).
6. **ReportLab Document Generator**: Compiles metrics into a corporate-ready PDF format complete with header highlights, cards, tabular logs, and design styling.

---

## ━━━━━━━━━━━━━━━━━━━━━━━
## 2. PROJECT FOLDER STRUCTURE
## ━━━━━━━━━━━━━━━━━━━━━━━

```
Object Detection/
├── Backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py        # FastAPI routes & Websockets setup
│   │   ├── detector.py    # YOLOv8 loading & inference module
│   │   ├── tracker.py     # Centroid/IOU Tracker & Trajectories
│   │   ├── database.py    # SQLAlchemy Tables & SQLite Queries
│   │   ├── export.py      # CSV/PDF Report Generators
│   │   └── static/        # Holds processed video files
│   └── requirements.txt   # Backend python packages
├── Frontend/
│   ├── src/
│   │   ├── components/    # Layout shells (Sidebar, Navbar)
│   │   ├── pages/         # LandingPage, LiveCamera, VideoUpload, Analytics, Logs
│   │   ├── App.jsx        # Tab router state & app controller
│   │   ├── index.css      # Custom scrollbars, glassmorphism CSS
│   │   └── main.jsx       # React bootstrap mounting
│   ├── tailwind.config.js # Custom dark colors and glow configurations
│   ├── postcss.config.js  # Tailwind compiler config
│   ├── vite.config.js     # React bundler config
│   └── package.json       # React dependencies (lucide, recharts, framer-motion)
├── Models/                # Workspace folder storing yolov8n.pt weight file
└── README.md              # Detailed documentation
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━
## 3. DATABASE SCHEMA DETAILS
## ━━━━━━━━━━━━━━━━━━━━━━━

The logs database uses a structured SQLite relational schema defined through SQLAlchemy:

### Table Name: `detection_logs`
| Column Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTOINCREMENT` | Unique log entry identifier. |
| `timestamp`| `DATETIME`| `DEFAULT UTC_NOW` | Local system time when log was recorded. |
| `track_id` | `INTEGER` | `INDEXED` | Unique tracking ID assigned by the Hungarian solver. |
| `class_name`| `VARCHAR` | `INDEXED` | YOLOv8 object class category (e.g. `person`, `car`). |
| `confidence`| `FLOAT` | - | Model prediction confidence score (0.0 to 1.0). |
| `source` | `VARCHAR` | `DEFAULT 'live'` | Video source ('live' or filename upload). |
| `x1` | `FLOAT` | `NULLABLE` | Bounding box horizontal start position. |
| `y1` | `FLOAT` | `NULLABLE` | Bounding box vertical start position. |
| `x2` | `FLOAT` | `NULLABLE` | Bounding box horizontal end position. |
| `y2` | `FLOAT` | `NULLABLE` | Bounding box vertical end position. |

---

## ━━━━━━━━━━━━━━━━━━━━━━━
## 4. INSTALLATION & SETUP GUIDE
## ━━━━━━━━━━━━━━━━━━━━━━━

### Prerequisites:
- **Python**: 3.8 to 3.12 installed on system PATH.
- **Node.js & npm**: Installed to bootstrap React bundles.

### Setup Step 1: Backend
1. Open terminal inside the workspace root:
   ```bash
   cd Backend
   ```
2. Create and activate a Virtual Environment:
   ```bash
   python -m venv venv
   # On Windows (CMD/PowerShell)
   .\venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```
3. Install package requirements:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server via Uvicorn:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

### Setup Step 2: Frontend
1. Open a new terminal inside the workspace root:
   ```bash
   cd Frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Open your web browser and navigate to `http://localhost:5173`.

---

## ━━━━━━━━━━━━━━━━━━━━━━━
## 5. DEPLOYMENT CONFIGURATIONS
## ━━━━━━━━━━━━━━━━━━━━━━━

### Production Deployment Strategy:

#### 1. Backend API (Dockerized Uvicorn)
To deploy the FastAPI server onto services like **Render**, **AWS ECS**, or **DigitalOcean App Platform**, wrap it using Docker:
```dockerfile
FROM python:3.10-slim

# Install system utilities needed by OpenCV
RUN apt-get update && apt-get install -y \
    ffmpeg libsm6 libxext6 git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 2. Frontend client (Vite Static Build)
To deploy the React dashboard onto Vercel, Netlify, or AWS CloudFront:
1. Compile the project files:
   ```bash
   npm run build
   ```
2. Upload the generated `dist/` directory directly to Vercel/Netlify for low-latency edge rendering.

---

## ━━━━━━━━━━━━━━━━━━━━━━━
## 6. INTERNSHIP PRESENTATION PITCH
## ━━━━━━━━━━━━━━━━━━━━━━━

If presenting this project to recruiters, evaluations committees, or senior engineering leads during internships:

- **The Problem Solved**: Multi-Object Tracking (MOT) in video footage usually requires heavy deep-learning feature extractors (like DeepSORT ResNet networks), which throttle frame processing to 5 FPS on typical hardware. AuraTrack solves this by using a high-accuracy, lightweight detector (YOLOv8 Nano) paired with a custom geometric IOU tracker.
- **WebSocket Streaming Speed**: Emphasize how frames are downscaled and compressed to JPEG in the browser *before* sending, and how coordinates are drawn using canvas vectors, achieving a smooth 30 FPS stream over network pipelines without GPU requirements.
- **SaaS Features Demo**: Showcase the spatial coordinate heatmaps drawn using 2D Gaussian kernels, line crossing zone controls, and the dynamically generated PDF reports.
