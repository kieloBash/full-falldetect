"use client";

import { COPY } from "@/lib/live-monitor/constants";
import type { Room } from "@/lib/live-monitor/types";
import { effState, formatCameraStamp } from "@/lib/live-monitor/utils";
import { Icon } from "@/components/icons/Icon";
import { useState, useEffect } from "react";

export interface CameraFeedProps {
  room: Room;
  now: number;
  reducedMotion: boolean;
  heightClassName?: string;
  onExpand?: () => void;
}

/**
 * Live MJPEG camera feed.
 *
 * The backend (backend/main.py) runs a Flask server on :8002 that serves
 * annotated frames at GET http://localhost:8002/stream/{deviceId}
 *
 * Since everything runs locally, the browser hits Flask directly —
 * no Next.js proxy needed.
 *
 * Falls back to the placeholder gradient when:
 *  - the sensor is offline
 *  - no deviceId is set on the room's sensor in the DB
 *  - the stream errors (Flask not running / camera disconnected)
 */
export function CameraFeed({
  room,
  now,
  reducedMotion,
  heightClassName = "h-[196px]",
  onExpand,
}: CameraFeedProps) {
  const state = effState(room);
  const online = room.sensorStatus !== "offline";

  // deviceId is set on the Sensor row in the DB (e.g. "CAM-1")
  // and must match what backend/main.py uses as the camera_id.
  const deviceId = (room as any).deviceId as string | null | undefined;

  // Direct to the Flask MJPEG server — no proxy needed for local setup
  const streamUrl = deviceId
    ? `http://localhost:8002/stream/${encodeURIComponent(deviceId)}`
    : null;

  const [imgError, setImgError] = useState(false);

  // Reset error flag whenever the room/device changes
  useEffect(() => {
    setImgError(false);
  }, [deviceId]);

  // ── Offline ───────────────────────────────────────────────────────────────
  if (!online) {
    return (
      <div
        className={`relative ${heightClassName} flex flex-col items-center justify-center gap-2 bg-[#0B1220] text-slate-500`}
      >
        <Icon name="wifiOff" size={26} strokeWidth={1.6} />
        <span className="text-[11px] font-semibold">{COPY.cameraOffline}</span>
      </div>
    );
  }

  // ── Live MJPEG stream ─────────────────────────────────────────────────────
  if (streamUrl && !imgError) {
    return (
      <div className={`relative ${heightClassName} overflow-hidden bg-[#0B1220]`}>

        {/* MJPEG stream — backend already draws the detection overlay on the frame */}
        <img
          src={streamUrl}
          alt={`Live feed — Room ${room.label}`}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />

        {/* REC badge */}
        <div className="pointer-events-none absolute left-[10px] top-[9px] flex items-center gap-[9px]">
          <div className="flex items-center gap-[5px] rounded-[5px] bg-[#0B1220]/60 px-[7px] py-[3px]">
            <span
              className={`h-2 w-2 rounded-full bg-red-500 ${reducedMotion ? "" : "animate-fd-dot"
                }`}
            />
            <span className="text-[9px] font-bold tracking-[.1em] text-slate-50">
              REC
            </span>
          </div>
          <span className="font-mono text-[10px] font-semibold text-slate-200/80">
            {deviceId}
          </span>
        </div>

        {/* Timestamp */}
        <div className="pointer-events-none absolute right-[10px] top-[10px] font-mono text-[9.5px] font-medium text-slate-200/80">
          {formatCameraStamp(now)}
        </div>

        {onExpand && (
          <button
            type="button"
            title="Open full feed"
            onClick={onExpand}
            className="absolute bottom-[10px] right-[10px] flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-[#0B1220]/60 text-white hover:bg-[#0B1220]/90"
          >
            <Icon name="expand" size={15} />
          </button>
        )}
      </div>
    );
  }

  // ── Fallback: gradient placeholder ────────────────────────────────────────
  // Shown when no deviceId is configured or the stream can't be reached.
  const isAlert = state === "active" || state === "acknowledged";

  return (
    <div className={`relative ${heightClassName} overflow-hidden bg-[#0B1220]`}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_30%_20%,#1e293b,#0B1220)]" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(rgba(0,0,0,.16) 0 1px, transparent 1px 3px)",
          boxShadow: "inset 0 0 70px rgba(0,0,0,.5)",
        }}
      />

      {/* REC + camera id */}
      <div className="pointer-events-none absolute left-[10px] top-[9px] flex items-center gap-[9px]">
        <div className="flex items-center gap-[5px] rounded-[5px] bg-[#0B1220]/50 px-[7px] py-[3px]">
          <span
            className={`h-2 w-2 rounded-full bg-red-500 ${reducedMotion ? "" : "animate-fd-dot"
              }`}
          />
          <span className="text-[9px] font-bold tracking-[.1em] text-slate-50">
            REC
          </span>
        </div>
        <span className="font-mono text-[10px] font-semibold text-slate-200/80">
          {deviceId ?? `Room ${room.label}`}
        </span>
      </div>

      <div className="pointer-events-none absolute right-[10px] top-[10px] font-mono text-[9.5px] font-medium text-slate-200/80">
        {formatCameraStamp(now)}
      </div>

      {/* Simulated bounding box */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={`relative rounded border-2 shadow-[0_0_0_1px_rgba(0,0,0,.3)] ${isAlert
            ? "border-red-500 h-[26%] w-[46%] translate-y-[30%]"
            : "border-teal-400 h-[54%] w-[30%]"
            }`}
        >
          <span
            className={`absolute -left-[2px] -top-[18px] whitespace-nowrap rounded-[3px] px-[5px] py-[2px] text-[9px] font-bold tracking-[.06em] text-white ${isAlert ? "bg-red-600" : "bg-teal-600"
              }`}
          >
            {isAlert ? "FALL DETECTED" : "Person"}
          </span>
        </div>
      </div>

      {/* Stream unavailable notice */}
      <div className="absolute inset-0 flex items-end justify-center pb-3">
        <span className="rounded bg-slate-900/70 px-2 py-1 text-[9px] text-slate-400">
          {imgError ? "Stream unavailable" : "No camera configured"}
        </span>
      </div>

      {onExpand && (
        <button
          type="button"
          title="Open full feed"
          onClick={onExpand}
          className="absolute bottom-[10px] right-[10px] flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-[#0B1220]/60 text-white hover:bg-[#0B1220]/90"
        >
          <Icon name="expand" size={15} />
        </button>
      )}
    </div>
  );
}