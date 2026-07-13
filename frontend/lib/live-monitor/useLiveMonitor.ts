"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { INITIAL_ACTIVITY, INITIAL_PINNED_ROOM_IDS } from "./mock-data";
import {
  useAcknowledgeMutation,
  useFlagFalseAlarmMutation,
  useReconnectSensorMutation,
  useResolveMutation,
  useRoomsQuery,
} from "./queries";
import type { ActivityItem, FloorId, Room, Toast, ViewMode } from "./types";
import { effState, formatClockTime } from "./utils";

export interface UseLiveMonitorOptions {
  /** Demo affordance: opens with Room 201 already in an active fall. */
  startWithActiveFall?: boolean;
  muteSound?: boolean;
  reduceMotion?: boolean;
}

/**
 * Owns every piece of state and every mutation for the Live Monitor screen.
 * Pulled out of the page component so the render tree stays declarative —
 * `<LiveMonitor />` just wires this hook's return value to presentational
 * components.
 *
 * The room roster comes from `useRoomsQuery()` (TanStack Query, currently
 * mock-backed — see `lib/live-monitor/api.ts`) and is copied into local
 * state on mount. From there, response actions (acknowledge/resolve/false
 * alarm/reconnect) go through `useMutation` hooks from `./queries`; each
 * mutation's `onSuccess` applies the same local patch this screen always
 * used, so today's mock swap-in is a no-op for the UI and a one-file change
 * (`api.ts`) once a backend exists. Local-only concerns that have no server
 * counterpart — the demo's Simulate fall trigger, timers, toasts, pin
 * state, view/floor/search — stay as plain React state.
 */
export function useLiveMonitor(options: UseLiveMonitorOptions = {}) {
  const { startWithActiveFall = false, muteSound = false, reduceMotion = false } = options;

  const roomsQuery = useRoomsQuery();
  const [rooms, setRooms] = useState<Room[]>(roomsQuery.data);
  const [view, setView] = useState<ViewMode>("grid");
  const [floor, setFloor] = useState<FloorId>("2");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [muted, setMuted] = useState(muteSound);
  const [pinned, setPinned] = useState<string[]>(INITIAL_PINNED_ROOM_IDS);
  const [faRoomId, setFaRoomId] = useState<string | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>(INITIAL_ACTIVITY);

  const uid = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* 1s tick drives live elapsed timers and the camera-feed timestamp. */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const patchRoom = useCallback((id: string, patch: Partial<Room>) => {
    setRooms((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addActivity = useCallback((text: string, color: string) => {
    setActivity((a) => [{ id: `ac${++uid.current}`, text, when: formatClockTime(), color }, ...a].slice(0, 12));
  }, []);

  const toast = useCallback((text: string, dot: string = "bg-teal-600") => {
    const id = `to${++uid.current}`;
    setToasts((t) => [...t, { id, text, dot }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const beep = useCallback(() => {
    if (muted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      audioCtxRef.current = audioCtxRef.current || new AudioCtx();
      const ac = audioCtxRef.current;
      [0, 0.18].forEach((dt) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        osc.connect(gain);
        gain.connect(ac.destination);
        const t0 = ac.currentTime + dt;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.13, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
        osc.start(t0);
        osc.stop(t0 + 0.15);
      });
    } catch {
      // Audio is a nice-to-have; ignore autoplay-policy / unsupported-browser failures.
    }
  }, [muted]);

  /* ── Actions ────────────────────────────────────────────────────────── */

  const simulateFall = useCallback(
    (forceId?: string) => {
      setRooms((rs) => {
        const candidates = rs.filter((r) => r.floor === floor && r.alertState === "idle" && r.sensorStatus !== "offline");
        const room = forceId ? rs.find((r) => r.id === forceId) : candidates[Math.floor(Math.random() * candidates.length)];
        if (!room) {
          toast("No available rooms to simulate", "bg-amber-600");
          return rs;
        }
        setSelectedId(room.id);
        beep();
        addActivity(`Fall detected in Room ${room.label}`, "bg-red-600");
        return rs.map((r) =>
          r.id === room.id ? { ...r, alertState: "active", startedAt: Date.now(), acknowledgedBy: null, falseAlarmReason: null } : r
        );
      });
    },
    [floor, beep, addActivity, toast]
  );

  const acknowledgeMutation = useAcknowledgeMutation();
  const acknowledge = useCallback(
    (id: string) => {
      const r = rooms.find((x) => x.id === id);
      if (!r || r.alertState !== "active") return;
      const secs = r.startedAt ? Math.floor((Date.now() - r.startedAt) / 1000) : 0;
      acknowledgeMutation.mutate(id, {
        onSuccess: ({ acknowledgedBy }) => {
          setRooms((rs) => rs.map((x) => (x.id === id ? { ...x, alertState: "acknowledged", acknowledgedBy } : x)));
          addActivity(`David O. acknowledged Room ${r.label} · ${secs}s`, "bg-amber-600");
          toast(`Acknowledged Room ${r.label} — responding`, "bg-amber-600");
        },
      });
    },
    [rooms, acknowledgeMutation, addActivity, toast]
  );

  const resolveMutation = useResolveMutation();
  const resolve = useCallback(
    (id: string) => {
      const r = rooms.find((x) => x.id === id);
      resolveMutation.mutate(id, {
        onSuccess: () => {
          patchRoom(id, { alertState: "resolved" });
          if (r) {
            addActivity(`Room ${r.label} resolved — no injury`, "bg-green-600");
            toast(`Room ${r.label} resolved`, "bg-green-600");
          }
          setTimeout(() => patchRoom(id, { alertState: "idle", startedAt: null, acknowledgedBy: null }), 2600);
        },
      });
    },
    [rooms, resolveMutation, patchRoom, addActivity, toast]
  );

  const flagFalseAlarmMutation = useFlagFalseAlarmMutation();
  const confirmFalseAlarm = useCallback(
    (reason: string) => {
      const id = faRoomId;
      if (!id) return;
      const r = rooms.find((x) => x.id === id);
      flagFalseAlarmMutation.mutate(
        { roomId: id, reason },
        {
          onSuccess: () => {
            patchRoom(id, { alertState: "falsealarm", falseAlarmReason: reason });
            setFaRoomId(null);
            if (r) {
              addActivity(`Flagged false alarm — ${reason.toLowerCase()} · Room ${r.label}`, "bg-slate-400");
              toast(`Room ${r.label} flagged false alarm`, "bg-slate-400");
            }
            setTimeout(() => patchRoom(id, { alertState: "idle", startedAt: null, acknowledgedBy: null, falseAlarmReason: null }), 3800);
          },
        }
      );
    },
    [faRoomId, rooms, flagFalseAlarmMutation, patchRoom, addActivity, toast]
  );

  const cancelFalseAlarm = useCallback(() => setFaRoomId(null), []);

  const reconnectSensorMutation = useReconnectSensorMutation();
  const reconnectSensor = useCallback(
    (id: string) => {
      const r = rooms.find((x) => x.id === id);
      reconnectSensorMutation.mutate(id, {
        onSuccess: () => {
          patchRoom(id, { sensorStatus: "online" });
          if (r) {
            addActivity(`Sensor ${r.label} reconnected — back online`, "bg-green-600");
            toast(`Room ${r.label} sensor back online`, "bg-green-600");
          }
        },
      });
    },
    [rooms, reconnectSensorMutation, patchRoom, addActivity, toast]
  );

  const togglePin = useCallback((id: string) => {
    setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }, []);

  const toggleMuted = useCallback(() => setMuted((m) => !m), []);
  const clearSearch = useCallback(() => setQuery(""), []);
  const clearSelection = useCallback(() => setSelectedId(null), []);
  const openCameraModal = useCallback((id: string) => setLiveId(id), []);
  const closeCameraModal = useCallback(() => setLiveId(null), []);
  const openFalseAlarmDialog = useCallback((id: string) => setFaRoomId(id), []);
  const selectRoom = useCallback((id: string) => setSelectedId(id), []);

  const selectFloor = useCallback((next: FloorId) => {
    setFloor(next);
    setSelectedId(null);
  }, []);

  /** Jumps to a specific room, switching floor first if it lives on the other one (used by the pinned-residents list). */
  const focusRoom = useCallback((room: Room) => {
    setFloor(room.floor);
    setSelectedId(room.id);
  }, []);

  /* Keyboard shortcuts: A acknowledge · F false alarm · / focus search · Esc close top-most surface */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (e.key === "/" && active !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        if (faRoomId) setFaRoomId(null);
        else if (liveId) setLiveId(null);
        else if (selectedId) setSelectedId(null);
        return;
      }
      if (active && (active.tagName === "INPUT" || active.tagName === "SELECT")) return;
      const r = rooms.find((x) => x.id === selectedId);
      if (!r) return;
      if ((e.key === "a" || e.key === "A") && r.alertState === "active") {
        e.preventDefault();
        acknowledge(r.id);
      }
      if ((e.key === "f" || e.key === "F") && (r.alertState === "active" || r.alertState === "acknowledged")) {
        e.preventDefault();
        setFaRoomId(r.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rooms, selectedId, faRoomId, liveId, acknowledge]);

  /* Optional prop: open mid-incident for demos/storybook-style embeds. */
  useEffect(() => {
    if (!startWithActiveFall) return;
    const t = setTimeout(() => simulateFall("201"), 400);
    return () => clearTimeout(t);
    // Intentionally runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Derived state ──────────────────────────────────────────────────── */

  const roomsOnFloor = useMemo(() => rooms.filter((r) => r.floor === floor), [rooms, floor]);

  const visibleRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roomsOnFloor;
    return roomsOnFloor.filter((r) => r.label.toLowerCase().includes(q) || r.resident.toLowerCase().includes(q));
  }, [roomsOnFloor, query]);

  const sortedRooms = useMemo(() => {
    const rank = (r: Room) => {
      const st = effState(r);
      return st === "active" ? 0 : st === "acknowledged" ? 1 : st === "resolved" ? 2 : 3;
    };
    return [...visibleRooms].sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
  }, [visibleRooms]);

  const activeCount = useMemo(() => roomsOnFloor.filter((r) => r.alertState === "active").length, [roomsOnFloor]);
  const clearCount = useMemo(() => roomsOnFloor.filter((r) => effState(r) === "idle").length, [roomsOnFloor]);
  const onlineCount = useMemo(() => roomsOnFloor.filter((r) => r.sensorStatus === "online").length, [roomsOnFloor]);
  const anySensorDown = useMemo(() => roomsOnFloor.some((r) => r.sensorStatus !== "online"), [roomsOnFloor]);

  const selectedRoom = useMemo(
    () => (selectedId ? rooms.find((r) => r.id === selectedId && r.floor === floor) ?? null : null),
    [rooms, selectedId, floor]
  );
  const liveRoom = useMemo(() => (liveId ? rooms.find((r) => r.id === liveId) ?? null : null), [rooms, liveId]);
  const faRoom = useMemo(() => (faRoomId ? rooms.find((r) => r.id === faRoomId) ?? null : null), [rooms, faRoomId]);
  const pinnedRooms = useMemo(() => pinned.map((id) => rooms.find((r) => r.id === id)).filter((r): r is Room => Boolean(r)), [pinned, rooms]);

  const jumpToFirstActiveAlert = useCallback(() => {
    const a = roomsOnFloor.find((r) => r.alertState === "active");
    if (a) {
      setSelectedId(a.id);
      setView("grid");
    }
  }, [roomsOnFloor]);

  return {
    // raw state
    view,
    setView,
    floor,
    query,
    setQuery,
    muted,
    reducedMotion: reduceMotion,
    now,
    toasts,
    activity,
    searchInputRef,

    // derived
    roomsOnFloor,
    sortedRooms,
    activeCount,
    clearCount,
    onlineCount,
    anySensorDown,
    selectedRoom,
    liveRoom,
    faRoom,
    pinnedRooms,
    isPinned: (id: string) => pinned.includes(id),

    // actions
    selectFloor,
    selectRoom,
    focusRoom,
    clearSelection,
    clearSearch,
    toggleMuted,
    togglePin,
    simulateFall,
    acknowledge,
    resolve,
    openFalseAlarmDialog,
    cancelFalseAlarm,
    confirmFalseAlarm,
    reconnectSensor,
    openCameraModal,
    closeCameraModal,
    jumpToFirstActiveAlert,
    notifyOutOfScope: () => toast("This handoff covers Live Monitor only", "bg-teal-600"),
  };
}

export type UseLiveMonitorReturn = ReturnType<typeof useLiveMonitor>;
