import numpy as np
from scipy.optimize import linear_sum_assignment

def calculate_iou(box1, box2):
    """
    Calculate the Intersection over Union (IOU) of two bounding boxes.
    Box format: [x1, y1, x2, y2]
    """
    x1_1, y1_1, x2_1, y2_1 = box1
    x1_2, y1_2, x2_2, y2_2 = box2

    # Get intersection area coordinates
    x1_i = max(x1_1, x1_2)
    y1_i = max(y1_1, y1_2)
    x2_i = min(x2_1, x2_2)
    y2_i = min(y2_1, y2_2)

    if x2_i < x1_i or y2_i < y1_i:
        return 0.0

    intersection_area = (x2_i - x1_i) * (y2_i - y1_i)

    # Calculate union area
    area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
    area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
    union_area = area1 + area2 - intersection_area

    if union_area <= 0:
        return 0.0

    return intersection_area / union_area

class Track:
    def __init__(self, track_id, bbox, class_name, confidence):
        self.id = track_id
        self.bbox = bbox  # [x1, y1, x2, y2]
        self.class_name = class_name
        self.confidence = confidence
        self.age = 0  # Number of frames since last update
        self.total_frames = 1
        
        # Keep track of centroid trajectory for drawing trails or counting directions
        self.centroid = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)
        self.trajectory = [self.centroid]

    def update(self, bbox, confidence):
        self.bbox = bbox
        self.confidence = confidence
        self.age = 0
        self.total_frames += 1
        self.centroid = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)
        self.trajectory.append(self.centroid)
        if len(self.trajectory) > 30:  # Keep trail of last 30 frames
            self.trajectory.pop(0)

class Tracker:
    def __init__(self, max_age=15, min_iou=0.3):
        self.max_age = max_age
        self.min_iou = min_iou
        self.track_id_counter = 1
        self.tracks = []

    def update(self, detections):
        """
        Update tracker with new detections.
        detections: list of dicts, each with keys 'bbox' [x1, y1, x2, y2], 'class_name', 'confidence'
        """
        # Increment age of all existing tracks
        for track in self.tracks:
            track.age += 1

        if len(self.tracks) == 0:
            # All detections start new tracks
            for det in detections:
                self.tracks.append(Track(self.track_id_counter, det['bbox'], det['class_name'], det['confidence']))
                self.track_id_counter += 1
            return self.get_active_tracks()

        if len(detections) == 0:
            # Remove old tracks
            self.tracks = [t for t in self.tracks if t.age <= self.max_age]
            return self.get_active_tracks()

        # Calculate cost matrix based on 1 - IOU
        # We also enforce that class_name must match to associate tracks
        num_tracks = len(self.tracks)
        num_detections = len(detections)
        cost_matrix = np.ones((num_tracks, num_detections))

        for t_idx, track in enumerate(self.tracks):
            for d_idx, det in enumerate(detections):
                # Only match if classes are identical
                if track.class_name == det['class_name']:
                    iou = calculate_iou(track.bbox, det['bbox'])
                    cost_matrix[t_idx, d_idx] = 1.0 - iou
                else:
                    cost_matrix[t_idx, d_idx] = 1.0  # Infinite cost (no match)

        # Solve assignment using Hungarian algorithm
        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        assigned_tracks = set()
        assigned_detections = set()

        for r, c in zip(row_ind, col_ind):
            cost = cost_matrix[r, c]
            iou = 1.0 - cost
            
            # If the IOU is high enough, update track
            if iou >= self.min_iou:
                self.tracks[r].update(detections[c]['bbox'], detections[c]['confidence'])
                assigned_tracks.add(r)
                assigned_detections.add(c)

        # Remove dead tracks
        self.tracks = [t for i, t in enumerate(self.tracks) if i in assigned_tracks or t.age <= self.max_age]

        # Register new detections as new tracks
        for d_idx, det in enumerate(detections):
            if d_idx not in assigned_detections:
                self.tracks.append(Track(self.track_id_counter, det['bbox'], det['class_name'], det['confidence']))
                self.track_id_counter += 1

        return self.get_active_tracks()

    def get_active_tracks(self):
        # Return tracks that are fresh (age == 0) or recently updated to smooth out missing detections
        # A track is active if its age is small (e.g. <= 2)
        active = []
        for t in self.tracks:
            if t.age <= 2:
                active.append({
                    "track_id": t.id,
                    "bbox": [int(x) for x in t.bbox],
                    "class_name": t.class_name,
                    "confidence": float(t.confidence),
                    "trajectory": [[int(pt[0]), int(pt[1])] for pt in t.trajectory]
                })
        return active
