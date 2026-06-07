import os
import cv2
import numpy as np
import torch

# Monkeypatch torch.load to bypass weights_only=True restriction in PyTorch 2.6+
original_load = torch.load
def patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return original_load(*args, **kwargs)
torch.load = patched_load

from ultralytics import YOLO

# Models folder path in the workspace root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(BASE_DIR, "Models")
os.makedirs(MODELS_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODELS_DIR, "yolov8n.pt")

class YOLODetector:
    def __init__(self):
        print(f"Loading YOLOv8 model from {MODEL_PATH}...")
        # Ultralytics downloads the model automatically if it does not exist
        self.model = YOLO(MODEL_PATH)
        self.names = self.model.names  # Class map index -> name

    def detect(self, frame, conf_threshold=0.25, selected_classes=None):
        """
        Run object detection on an image frame.
        frame: OpenCV numpy array (BGR format)
        conf_threshold: minimum confidence score
        selected_classes: list of class names to filter by (if None, detect all)
        """
        results = self.model(frame, verbose=False)[0]
        
        detections = []
        for box in results.boxes:
            conf = float(box.conf[0])
            if conf < conf_threshold:
                continue

            class_idx = int(box.cls[0])
            class_name = self.names[class_idx]

            # Filter by class name if needed
            if selected_classes is not None and class_name not in selected_classes:
                continue

            # Bounding box coordinates
            xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
            
            detections.append({
                "bbox": xyxy,
                "class_name": class_name,
                "confidence": conf
            })
            
        return detections
