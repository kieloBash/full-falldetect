"use client";

import { Floor } from "@/app/generated/prisma/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFloors } from "../floor/queries";
import {
  useAcknowledgeMutation,
  useActivityQuery,
  useFlagFalseAlarmMutation,
  usePinMutation,
  usePinnedQuery,
  useReconnectSensorMutation,
  useResolveMutation,
  useRoomsQuery,
  useSimulateFallMutation,
  useUnpinMutation,
} from "./queries";
import type { ActivityItem, FloorId, Room, Toast, ViewMode } from "./types";
import { effState } from "./utils";

export interface UseLiveMonitorOptions {
  /** Demo affordance: opens with a simulated active fall on Room 201. */
  startWithActiveFall?: boolean;
  muteSound?: boolean;
  reduceMotion?: boolean;
}

/**
 * Owns state + mutations for the Live Monitor screen. The DB is the source of
 * truth for everything durable:
 *  - rooms come from `useRoomsQuery(floor)` (GET /api/monitor)
 *  - pinned rooms come from `usePinnedQuery` (GET /api/pinned), toggled via
 *    pin/unpin mutations
 *  - the activity feed comes from `useActivityQuery` (GET /api/activity);
 *    the server writes each entry when an action's route runs, so the client
 *    no longer appends activity locally — it just invalidates and refetches.
 *
 * Response actions invalidate rooms + activity on success ("refetch after
 * each action"). Only genuinely ephemeral concerns stay as React state:
 * view/floor/search/mute/toasts/camera-modal/false-alarm-dialog and the 1s
 * timer that drives elapsed counters.
 */
export function useLiveMonitor(options: UseLiveMonitorOptions = {}) {
  const { startWithActiveFall = false, muteSound = false, reduceMotion = false } = options;

  const [view, setView] = useState<ViewMode>("grid");
  const [floor, setFloor] = useState<FloorId | null>("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [muted, setMuted] = useState(muteSound);
  const [faRoomId, setFaRoomId] = useState<string | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const uid = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const roomsQuery = useRoomsQuery(floor);
  const rooms = useMemo<Room[]>(() => roomsQuery.data ?? [], [roomsQuery.data]);

  const pinnedQuery = usePinnedQuery();
  const pinned = useMemo<string[]>(() => pinnedQuery.data ?? [], [pinnedQuery.data]);

  const activityQuery = useActivityQuery();
  const activity = useMemo<ActivityItem[]>(() => activityQuery.data ?? [], [activityQuery.data]);

  const floorsQuery = useFloors();
  const floors = useMemo<Floor[]>(() => floorsQuery.data ?? [], [floorsQuery.data]);

  useEffect(() => {
    if (floors.length > 0)
      setFloor(floors[0].id)
  }, [floors])

  /* 1s tick drives live elapsed timers and the camera-feed timestamp. */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
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

  const simulateFallMutation = useSimulateFallMutation();
  const simulateFall = useCallback(
    (forceId?: string) => {
      if (!floor) return
      simulateFallMutation.mutate(
        { roomId: forceId, floor },
        {
          onSuccess: ({ roomId }) => {
            setSelectedId(roomId);
            beep();
          },
          onError: (e) => toast(e instanceof Error ? e.message : "Could not simulate fall", "bg-amber-600"),
        }
      );
    },
    [floor, simulateFallMutation, beep, toast]
  );

  const acknowledgeMutation = useAcknowledgeMutation();
  const acknowledge = useCallback(
    (id: string) => {
      const r = rooms.find((x) => x.id === id);
      if (!r || r.alertState !== "active") return;
      acknowledgeMutation.mutate(id, {
        onSuccess: () => toast(`Acknowledged Room ${r.label} — responding`, "bg-amber-600"),
        onError: (e) => toast(e instanceof Error ? e.message : "Acknowledge failed", "bg-amber-600"),
      });
    },
    [rooms, acknowledgeMutation, toast]
  );

  const resolveMutation = useResolveMutation();
  const resolve = useCallback(
    (id: string) => {
      const r = rooms.find((x) => x.id === id);
      resolveMutation.mutate(id, {
        onSuccess: () => r && toast(`Room ${r.label} resolved`, "bg-green-600"),
        onError: (e) => toast(e instanceof Error ? e.message : "Resolve failed", "bg-green-600"),
      });
    },
    [rooms, resolveMutation, toast]
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
            setFaRoomId(null);
            if (r) toast(`Room ${r.label} flagged false alarm`, "bg-slate-400");
          },
          onError: (e) => toast(e instanceof Error ? e.message : "False alarm failed", "bg-slate-400"),
        }
      );
    },
    [faRoomId, rooms, flagFalseAlarmMutation, toast]
  );

  const cancelFalseAlarm = useCallback(() => setFaRoomId(null), []);

  const reconnectSensorMutation = useReconnectSensorMutation();
  const reconnectSensor = useCallback(
    (id: string) => {
      const r = rooms.find((x) => x.id === id);
      reconnectSensorMutation.mutate(id, {
        onSuccess: () => r && toast(`Room ${r.label} sensor back online`, "bg-green-600"),
        onError: (e) => toast(e instanceof Error ? e.message : "Reconnect failed", "bg-green-600"),
      });
    },
    [rooms, reconnectSensorMutation, toast]
  );

  const pinMutation = usePinMutation();
  const unpinMutation = useUnpinMutation();
  const togglePin = useCallback(
    (id: string) => {
      if (pinned.includes(id)) unpinMutation.mutate(id);
      else pinMutation.mutate(id);
    },
    [pinned, pinMutation, unpinMutation]
  );

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

  const focusRoom = useCallback((room: Room) => {
    setFloor(room.floor.id);
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

  /* Optional prop: open mid-incident for demos. Fires once rooms have loaded. */
  const didAutoSim = useRef(false);
  useEffect(() => {
    if (!startWithActiveFall || didAutoSim.current || rooms.length === 0) return;
    didAutoSim.current = true;
    const t = setTimeout(() => simulateFall("201"), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms.length, startWithActiveFall]);

  /* ── Derived state ──────────────────────────────────────────────────── */

  const roomsOnFloor = useMemo(() => {
    return floor ? rooms.filter((r) => r.floor.id === floor) : rooms
  }, [rooms, floor]);

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
    () => (selectedId ? rooms.find((r) => r.id === selectedId && r.floor.id === floor) ?? null : null),
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
    roomsLoading: roomsQuery.isPending,
    floors,

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
