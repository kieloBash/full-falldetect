import { RISK_META, SENSOR_META } from "@/lib/live-monitor/constants";
import { historyForRisk } from "@/lib/live-monitor/mock-data";
import type { Room } from "@/lib/live-monitor/types";
import { badgeVariantFor, effState, elapsedSeconds, formatElapsed } from "@/lib/live-monitor/utils";
import { Icon } from "@/components/icons/Icon";
import { StatusBadge } from "./StatusBadge";

export interface InspectorRoomDetailProps {
  room: Room;
  floorLabel: string;
  pinned: boolean;
  now: number;
  onClose: () => void;
  onAcknowledge: () => void;
  onFlagFalseAlarm: () => void;
  onResolve: () => void;
  onReconnect: () => void;
  onLiveView: () => void;
  onTogglePin: () => void;
}

/** Inspector content shown when a room is selected: identity, live timer, actions, sensor, pin, history. */
export function InspectorRoomDetail({
  room,
  floorLabel,
  pinned,
  now,
  onClose,
  onAcknowledge,
  onFlagFalseAlarm,
  onResolve,
  onReconnect,
  onLiveView,
  onTogglePin,
}: InspectorRoomDetailProps) {
  const state = effState(room);
  const risk = RISK_META[room.risk];
  const sensor = SENSOR_META[room.sensorStatus];
  const elapsed = elapsedSeconds(room.startedAt, now);
  const history = historyForRisk(room.history);

  return (
    <div>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <span className="text-[13px] font-semibold text-slate-600">Room detail</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          <Icon name="x" size={15} />
        </button>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-[13px]">
          <div className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-teal-600">
            {room.initials}
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-semibold">{room.resident}</div>
            <div className="mt-[2px] text-[12.5px] text-slate-600">
              Room {room.label} · {room.zone} · {floorLabel}
            </div>
          </div>
        </div>

        <div className="mt-[14px] flex gap-2">
          <StatusBadge variant={badgeVariantFor(room)} label={state === "falsealarm" ? "False alarm" : undefined} />
          <span className={`inline-flex items-center rounded-md px-[9px] py-[3px] text-[11px] font-semibold ${risk.bgClass} ${risk.textClass}`}>
            {risk.label}
          </span>
        </div>

        {(state === "active" || state === "acknowledged") && (
          <div
            className={`mt-4 rounded-[10px] border p-[14px] ${state === "active" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
              }`}
          >
            <div className="text-[11px] font-medium uppercase tracking-[.05em] text-slate-600">
              {state === "active" ? "Fall detected · elapsed" : "Responding · elapsed"}
            </div>
            <div className={`mt-[2px] text-[30px] font-bold tabular-nums ${state === "active" ? "text-red-600" : "text-amber-700"}`}>
              {formatElapsed(elapsed)}
            </div>
          </div>
        )}

        <div className="mt-[18px] flex flex-col gap-[10px]">
          {state === "active" && (
            <>
              <button
                type="button"
                onClick={onAcknowledge}
                className="flex h-11 items-center justify-center gap-[7px] rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700"
              >
                <Icon name="check" size={17} strokeWidth={2.2} />
                Acknowledge
              </button>
              <button
                type="button"
                onClick={onFlagFalseAlarm}
                className="h-[42px] rounded-lg border border-slate-300 bg-white text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100"
              >
                Flag false alarm
              </button>
            </>
          )}
          {state === "acknowledged" && (
            <>
              <button
                type="button"
                onClick={onResolve}
                className="flex h-11 items-center justify-center gap-[7px] rounded-lg border border-green-600 bg-white text-sm font-semibold text-green-700 hover:bg-green-100"
              >
                <Icon name="checkCircle" size={17} strokeWidth={2.2} />
                Mark resolved
              </button>
              <button
                type="button"
                onClick={onFlagFalseAlarm}
                className="h-[42px] rounded-lg border border-slate-300 bg-white text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100"
              >
                Flag false alarm
              </button>
            </>
          )}
          {(state === "idle" || state === "falsealarm") && (
            <button
              type="button"
              className="flex h-[42px] items-center justify-center gap-[7px] rounded-lg border border-slate-200 bg-white text-[13.5px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Icon name="assign" size={16} />
              Assign nurse
            </button>
          )}
        </div>

        <div className="mb-[10px] mt-[22px] text-[11px] font-semibold uppercase tracking-[.05em] text-slate-400">Sensor</div>
        <div className="flex items-center justify-between rounded-[9px] border border-slate-200 px-[13px] py-[11px]">
          <div className="flex items-center gap-[9px]">
            <span className={`h-[9px] w-[9px] rounded-full ${sensor.dotClass}`} />
            <span className="text-[13px] font-medium text-slate-900">{sensor.label}</span>
          </div>
          <span className="text-[11.5px] text-slate-400">{sensor.meta}</span>
        </div>

        {state === "offline" ? (
          <button
            type="button"
            onClick={onReconnect}
            className="mt-[10px] flex h-10 w-full items-center justify-center gap-2 rounded-[9px] bg-teal-600 text-[13px] font-semibold text-white hover:bg-teal-700"
          >
            <Icon name="reconnect" size={16} strokeWidth={2.2} />
            Reconnect sensor
          </button>
        ) : (
          <button
            type="button"
            onClick={onLiveView}
            className="mt-[10px] flex h-10 w-full items-center justify-center gap-2 rounded-[9px] border border-teal-200 bg-teal-50 text-[13px] font-semibold text-teal-700 hover:bg-teal-100"
          >
            <Icon name="camera" size={16} strokeWidth={2} />
            Live camera feed
          </button>
        )}

        <button
          type="button"
          onClick={onTogglePin}
          className={`mt-[10px] flex h-10 w-full items-center justify-center gap-2 rounded-[9px] text-[13px] font-semibold ${pinned ? "border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
        >
          <Icon name="pin" size={15} fill={pinned ? "currentColor" : "none"} />
          {pinned ? "Unpin from camera wall" : "Pin to camera wall"}
        </button>

        {history.length > 0 && (
          <>
            <div className="mb-[10px] mt-[22px] text-[11px] font-semibold uppercase tracking-[.05em] text-slate-400">Recent incidents</div>
            {history.map((h, i) => (
              <div key={i} className="flex items-start gap-[10px] border-b border-slate-100 py-[9px]">
                <span className={`mt-[5px] h-[7px] w-[7px] flex-none rounded-full ${h.color}`} />
                <div>
                  <div className="text-[12.5px] font-medium text-slate-900">{h.text}</div>
                  <div className="mt-[1px] text-[11px] text-slate-400">{h.when}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
