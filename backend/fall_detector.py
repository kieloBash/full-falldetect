from collections import deque
from dataclasses import dataclass, field
from typing import Optional, Tuple, Deque

BBox = Tuple[float, float, float, float]  # (x1, y1, x2, y2)


@dataclass
class FrameState:
    outside_ratio: float          # 0.0 = fully inside bed box, 1.0 = fully outside
    centroid_y: Optional[float]   # patient box vertical center, or None if not detected
    warning: bool = False         # sustained-condition warning (pre-alert)
    alert: bool = False           # confirmed fall alert
    reason: str = ""              # human-readable trigger reason


def _overlap_ratio_outside(patient_box: BBox, bed_box: BBox) -> float:
    """Fraction of the patient box's area that falls outside the bed box."""
    px1, py1, px2, py2 = patient_box
    bx1, by1, bx2, by2 = bed_box

    ix1, iy1 = max(px1, bx1), max(py1, by1)
    ix2, iy2 = min(px2, bx2), min(py2, by2)
    inter_area = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)

    patient_area = max(1e-6, (px2 - px1) * (py2 - py1))
    outside_area = patient_area - inter_area
    return max(0.0, min(1.0, outside_area / patient_area))


def _centroid_y(box: BBox) -> float:
    return (box[1] + box[3]) / 2.0


class FallDetector:
    def __init__(
        self,
        fps: float = 15.0,
        outside_ratio_threshold: float = 0.6,   # fraction of patient box outside bed to count as "out"
        sustained_seconds: float = 1.2,          # how long the condition must persist to alert
        warning_fraction: float = 0.7,           # fraction of the window that must be "out" to alert
        velocity_window_seconds: float = 0.5,    # window used to estimate downward velocity
        velocity_threshold_px_per_sec: float = 400.0,  # tune to your camera height/resolution
        missing_frame_grace: int = 5,            # consecutive missing-patient frames before treating as "gone"
    ):
        self.fps = fps
        self.outside_ratio_threshold = outside_ratio_threshold
        self.warning_fraction = warning_fraction
        self.velocity_threshold = velocity_threshold_px_per_sec
        self.missing_frame_grace = missing_frame_grace

        window_len = max(1, int(sustained_seconds * fps))
        self.window: Deque[FrameState] = deque(maxlen=window_len)

        vel_len = max(2, int(velocity_window_seconds * fps))
        self.velocity_window: Deque[Tuple[int, float]] = deque(maxlen=vel_len)  # (frame_idx, centroid_y)

        self._frame_idx = 0
        self._missing_streak = 0
        self._last_known_centroid_y: Optional[float] = None
        self._alerted = False  # simple debounce: don't re-fire every frame while still in alert state

    def update(self, patient_box: Optional[BBox], bed_box: Optional[BBox]) -> FrameState:
        self._frame_idx += 1

        # Case 1: no bed detected this frame -- can't evaluate, pass through.
        if bed_box is None:
            state = FrameState(outside_ratio=0.0, centroid_y=None, reason="no bed detected")
            self.window.append(state)
            return state

        # Case 2: patient not detected -- could be occluded, or could mean
        # they've left the frame entirely (e.g. fallen out of camera view).
        if patient_box is None:
            self._missing_streak += 1
            state = FrameState(outside_ratio=0.0, centroid_y=None)

            if (
                self._missing_streak >= self.missing_frame_grace
                and self._last_known_centroid_y is not None
                and self._last_known_centroid_y >= bed_box[3] - 0.15 * (bed_box[3] - bed_box[1])
            ):
                # Patient vanished shortly after being near the bed's lower edge --
                # treat as a likely fall (e.g. they fell below camera's field of view).
                state.alert = True
                state.reason = "patient disappeared near bed's lower edge"
                self._alerted = True

            self.window.append(state)
            return state

        self._missing_streak = 0
        cy = _centroid_y(patient_box)
        self._last_known_centroid_y = cy
        self.velocity_window.append((self._frame_idx, cy))

        ratio = _overlap_ratio_outside(patient_box, bed_box)
        is_out = ratio >= self.outside_ratio_threshold

        state = FrameState(outside_ratio=ratio, centroid_y=cy)
        self.window.append(state)

        # -- Sustained-position check --
        out_count = sum(1 for s in self.window if s.centroid_y is not None
                         and s.outside_ratio >= self.outside_ratio_threshold)
        window_fraction_out = out_count / max(1, len(self.window))
        sustained = (
            len(self.window) == self.window.maxlen
            and window_fraction_out >= self.warning_fraction
        )

        # -- Velocity check (downward = increasing y in image coords) --
        velocity = self._estimate_velocity()
        fast_downward = velocity is not None and velocity >= self.velocity_threshold

        if sustained:
            state.alert = True
            state.reason = f"patient outside bed for {window_fraction_out:.0%} of last {len(self.window)/self.fps:.1f}s"
            self._alerted = True
        elif fast_downward and is_out:
            # Fast downward motion AND currently mostly outside the bed --
            # catches the fall in progress rather than waiting for it to settle.
            state.alert = True
            state.reason = f"fast downward motion ({velocity:.0f}px/s) while outside bed"
            self._alerted = True
        elif is_out:
            state.warning = True
            state.reason = "patient currently outside bed (not yet sustained)"
        else:
            self._alerted = False  # reset debounce once patient is back on the bed

        return state

    def _estimate_velocity(self) -> Optional[float]:
        """Rough downward velocity in px/sec, from a simple linear fit over the recent window."""
        if len(self.velocity_window) < 2:
            return None
        (i0, y0), (i1, y1) = self.velocity_window[0], self.velocity_window[-1]
        dt_frames = i1 - i0
        if dt_frames <= 0:
            return None
        dt_seconds = dt_frames / self.fps
        return (y1 - y0) / dt_seconds  # positive = moving downward in image coords


# ---------------- Example integration with a YOLO inference loop ----------------
if __name__ == "__main__":
    """
    Pseudo-code sketch -- adapt to however you're running inference
    (ultralytics YOLO, OpenCV VideoCapture, etc).
    """
    # from ultralytics import YOLO
    # import cv2
    #
    # model = YOLO("your_model.pt")
    # cap = cv2.VideoCapture("your_video.mp4")
    # fps = cap.get(cv2.CAP_PROP_FPS) or 15
    # detector = FallDetector(fps=fps)
    #
    # PATIENT_CLASS_ID = 0
    # BED_CLASS_ID = 1
    #
    # while True:
    #     ret, frame = cap.read()
    #     if not ret:
    #         break
    #
    #     results = model.predict(frame, verbose=False)[0]
    #     patient_box, bed_box = None, None
    #     for box in results.boxes:
    #         cls_id = int(box.cls[0])
    #         xyxy = tuple(box.xyxy[0].tolist())
    #         if cls_id == PATIENT_CLASS_ID:
    #             patient_box = xyxy
    #         elif cls_id == BED_CLASS_ID:
    #             bed_box = xyxy
    #
    #     state = detector.update(patient_box, bed_box)
    #     if state.alert:
    #         print(f"FALL ALERT: {state.reason}")
    #     elif state.warning:
    #         print(f"warning: {state.reason}")

    print("This file defines FallDetector -- see the commented-out block above "
          "for how to wire it into a YOLO inference loop.")
