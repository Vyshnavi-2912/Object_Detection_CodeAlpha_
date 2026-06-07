import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, text, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database path
DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "detections.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DetectionLog(Base):
    __tablename__ = "detection_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    track_id = Column(Integer, index=True)
    class_name = Column(String, index=True)
    confidence = Column(Float)
    source = Column(String, default="live")  # 'live' or filename
    x1 = Column(Float, nullable=True)
    y1 = Column(Float, nullable=True)
    x2 = Column(Float, nullable=True)
    y2 = Column(Float, nullable=True)
    event_type = Column(String, default="detection") # 'detection' or 'crossing'

# Handle SQLite schema auto-migration (drop and recreate tables if structure mismatch)
try:
    with engine.connect() as conn:
        conn.execute(text("SELECT event_type, x1 FROM detection_logs LIMIT 1"))
except Exception:
    print("Database schema mismatch detected. Rebuilding SQLite tables...")
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception as e:
        print(f"Failed to drop old tables: {e}")

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper operations
def add_detection_log(track_id: int, class_name: str, confidence: float, source: str = "live", bbox: list = None, event_type: str = "detection"):
    db = SessionLocal()
    try:
        x1_val, y1_val, x2_val, y2_val = None, None, None, None
        if bbox and len(bbox) == 4:
            x1_val, y1_val, x2_val, y2_val = map(float, bbox)
            
        log = DetectionLog(
            track_id=track_id,
            class_name=class_name,
            confidence=confidence,
            source=source,
            x1=x1_val,
            y1=y1_val,
            x2=x2_val,
            y2=y2_val,
            event_type=event_type,
            timestamp=datetime.datetime.now() # Local time
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    except Exception as e:
        print(f"Error writing to database: {e}")
        db.rollback()
    finally:
        db.close()

def query_logs(limit: int = 100, offset: int = 0, class_filter: str = None, source_filter: str = None, event_filter: str = None, search: str = None, sort_by: str = "timestamp", sort_order: str = "desc"):
    db = SessionLocal()
    try:
        q = db.query(DetectionLog)
        
        # Apply filters
        if class_filter:
            q = q.filter(DetectionLog.class_name == class_filter)
        if source_filter:
            q = q.filter(DetectionLog.source == source_filter)
        if event_filter:
            q = q.filter(DetectionLog.event_type == event_filter)
            
        # Apply search on class name or source file
        if search:
            search_pattern = f"%{search}%"
            q = q.filter(
                (DetectionLog.class_name.like(search_pattern)) | 
                (DetectionLog.source.like(search_pattern))
            )
            
        # Apply sorting
        sort_col = getattr(DetectionLog, sort_by, DetectionLog.timestamp)
        if sort_order == "asc":
            q = q.order_by(sort_col.asc())
        else:
            q = q.order_by(sort_col.desc())
            
        total = q.count()
        logs = q.offset(offset).limit(limit).all()
        return {
            "total": total,
            "logs": [{
                "id": l.id,
                "timestamp": l.timestamp.isoformat(),
                "track_id": l.track_id,
                "class_name": l.class_name,
                "confidence": round(l.confidence, 2),
                "source": l.source,
                "event_type": l.event_type,
                "bbox": [l.x1, l.y1, l.x2, l.y2] if l.x1 is not None else None
            } for l in logs]
        }
    finally:
        db.close()

def get_analytics_summary():
    db = SessionLocal()
    try:
        # Total Detections & Crossings
        total_detections = db.query(DetectionLog).filter(DetectionLog.event_type == "detection").count()
        total_crossings = db.query(DetectionLog).filter(DetectionLog.event_type == "crossing").count()
        
        # Unique objects tracked (count of distinct track IDs)
        unique_objects = db.query(func.count(func.distinct(DetectionLog.track_id))).scalar() or 0
        
        # Average Confidence (Accuracy)
        avg_confidence = db.query(func.avg(DetectionLog.confidence)).scalar() or 0.0
        
        # Class frequency (by event_type == detection to represent unique items)
        freq_results = db.execute(
            text("""
                SELECT class_name, COUNT(*), AVG(confidence) 
                FROM detection_logs 
                WHERE event_type = 'detection'
                GROUP BY class_name 
                ORDER BY COUNT(*) DESC
            """)
        ).fetchall()
        
        freq_chart = []
        for row in freq_results:
            freq_chart.append({
                "class_name": row[0],
                "count": row[1],
                "avg_confidence": round(row[2], 2) if row[2] else 0.0
            })
            
        # Detections by hour (last 24 hours)
        timeline_results = db.execute(
            text("""
                SELECT strftime('%H:00', timestamp) as hour, COUNT(*) as count 
                FROM detection_logs 
                WHERE timestamp >= datetime('now', '-1 day')
                GROUP BY hour 
                ORDER BY hour ASC
            """)
        ).fetchall()
        
        timeline_chart = [{"hour": row[0], "count": row[1]} for row in timeline_results]
        
        # Recent logs summary
        recent_logs = db.query(DetectionLog).order_by(DetectionLog.timestamp.desc()).limit(15).all()
        recent = [{
            "id": l.id,
            "timestamp": l.timestamp.isoformat(),
            "track_id": l.track_id,
            "class_name": l.class_name,
            "confidence": round(l.confidence, 2),
            "source": l.source,
            "event_type": l.event_type,
            "bbox": [l.x1, l.y1, l.x2, l.y2] if l.x1 is not None else None
        } for l in recent_logs]
        
        return {
            "total_detections": total_detections,
            "total_crossings": total_crossings,
            "unique_objects": unique_objects,
            "average_accuracy": round(avg_confidence, 2),
            "class_frequency": freq_chart,
            "hourly_timeline": timeline_chart,
            "recent_detections": recent
        }
    finally:
        db.close()

def clear_logs():
    db = SessionLocal()
    try:
        db.query(DetectionLog).delete()
        db.commit()
    except Exception as e:
        print(f"Error clearing logs: {e}")
        db.rollback()
    finally:
        db.close()
