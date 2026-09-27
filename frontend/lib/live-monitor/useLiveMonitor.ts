// location: frontend/lib/live-monitor/useLiveMonitor.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAlertSound } from "@/lib/alert-sound/useAlertSound";
import { useFloors } from "../floor/queries";
import {
  useAcknowledgeMutation,
  useActivityQuery,
  useAllRoomsQuery,
  useFlagFalseAlarmMutation,
  usePinMutation,
  usePinnedQuery,
  useReconnectSensorMutation,
  useResolveMutation,
  useSimulateFallMutation,
  useUnpinMutation,
} from "./queries";
import type { ActivityItem, Floor, FloorId, Room, Toast, ViewMode } from "./types";
import { effState } from "./utils";

const HIGHLIGHT_MS = 2_500;

export interface UseLiveMonitorOptions {
  /** Swap pulsing/flashing animations for static styles. */
  reduceMotion?: boolean;
}

/**
 * Owns state + mutations for the Live Monitor screen. The DB is the source of truth:
 *  - rooms for EVERY floor come from `useAllRoomsQuery` (GET /api/monitor per floor,
 *    polled every 3 s), so alerts on other floors are never missed;
 *  - pinned rooms from `usePinnedQuery`, the activity feed from `useActivityQuery`.
 * Actions invalidate rooms + activity on success. The looping alarm lives in
 * `useAlertSound` and rings while any room on any floor has an ACTIVE fall.
 */
export function useLiveMonitor(options: UseLiveMonitorOptions = {}) {
  const { reduceMotion = false } = options;

  const [view, setView] = useState<ViewMode>("grid");
  /** The floor the user picked; `floor` below falls back to the first floor. */
  const [pickedFloor, setFloor] = useState<FloorId | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [faRoomId, setFaRoomId] = useState<string | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  /** Room whose tile flashes after "View room" (cleared after HIGHLIGHT_MS). */
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const uid = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const floorsQuery = useFloors();
  const floors = useMemo<Floor[]>(() => floorsQuery.data ?? [], [floorsQuery.data]);
  const floorIds = useMemo(() => floors.map((f) => f.id), [floors]);

  // Default to the first floor; also recovers if the picked floor was deleted in Admin.
  const floor: FloorId | null =
    pickedFloor && floors.some((f) => f.id === pickedFloor) ? pickedFloor : floors[0]?.id ?? null;

  const roomsQuery = useAllRoomsQuery(floorIds);
  const allRooms = roomsQuery.rooms;

  const pinnedQuery = usePinnedQuery();
  const pinned = useMemo<string[]>(() => pinnedQuery.data ?? [], [pinnedQuery.data]);

  const activityQuery = useActivityQuery();
  const activity = useMemo<ActivityItem[]>(() => activityQuery.data ?? [], [activityQuery.data]);

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

  /* ── Active falls on ALL floors + the looping alarm ─────────────────── */

  const activeRooms = useMemo(
    () =>
      allRooms
        .filter((r) => r.alertState === "active")
        .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0)),
    [allRooms]
  );
  const activeIds = useMemo(() => activeRooms.map((r) => r.id), [activeRooms]);
  const sound = useAlertSound({ activeIds });

  // Toast + auto-select for each newly detected fall (skips falls already open on page load).
  const prevActiveIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (roomsQuery.isPending) return;
    const current = new Set(activeIds);
    if (prevActiveIdsRef.current !== null) {
      const newlyActive = activeRooms.filter((r) => !prevActiveIdsRef.current!.has(r.id));
      for (const room of newlyActive) {
        toast(`Fall detected — Room ${room.label} (Floor ${room.floor.label})`, "bg-red-600");
      }
      const first = newlyActive[0];
      if (first && selectedId === null && first.floor.id === floor) setSelectedId(first.id);
    }
    prevActiveIdsRef.current = current;
  }, [activeIds, activeRooms, roomsQuery.isPending, toast, selectedId, floor]);

  /* ── Actions ────────────────────────────────────────────────────────── */

  const simulateFallMutation = useSimulateFallMutation();
  /** Omit roomId to let the server pick a random eligible room on the current floor. */
  const simulateFall = useCallback(
    (roomId?: string) => {
      if (!floor) return;
      simulateFallMutation.mutate(
        { roomId, floor },
        {
          onSuccess: ({ roomId }) => setSelectedId(roomId),
          onError: (e) => toast(e instanceof Error ? e.message : "Could not simulate fall", "bg-amber-600"),
        }
      );
    },
    [floor, simulateFallMutation, toast]
  );

  const acknowledgeMutation = useAcknowledgeMutation();
  const acknowledge = useCallback(
    (id: string) => {
      const r = allRooms.find((x) => x.id === id);
      if (!r || r.alertState !== "active") return;
      acknowledgeMutation.mutate(id, {
        onSuccess: () => toast(`Acknowledged Room ${r.label} — responding`, "bg-amber-600"),
        onError: (e) => toast(e instanceof Error ? e.message : "Acknowledge failed", "bg-amber-600"),
      });
    },
    [allRooms, acknowledgeMutation, toast]
  );

  const resolveMutation = useResolveMutation();
  const resolve = useCallback(
    (id: string) => {
      const r = allRooms.find((x) => x.id === id);
      resolveMutation.mutate(id, {
        onSuccess: () => r && toast(`Room ${r.label} resolved`, "bg-green-600"),
        onError: (e) => toast(e instanceof Error ? e.message : "Resolve failed", "bg-green-600"),
      });
    },
    [allRooms, resolveMutation, toast]
  );

  const flagFalseAlarmMutation = useFlagFalseAlarmMutation();
  const confirmFalseAlarm = useCallback(
    (reason: string) => {
      const id = faRoomId;
      if (!id) return;
      const r = allRooms.find((x) => x.id === id);
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
    [faRoomId, allRooms, flagFalseAlarmMutation, toast]
  );

  const cancelFalseAlarm = useCallback(() => setFaRoomId(null), []);

  const reconnectSensorMutation = useReconnectSensorMutation();
  const reconnectSensor = useCallback(
    (id: string) => {
      const r = allRooms.find((x) => x.id === id);
      reconnectSensorMutation.mutate(id, {
        onSuccess: () => r && toast(`Room ${r.label} sensor back online`, "bg-green-600"),
        onError: (e) => toast(e instanceof Error ? e.message : "Reconnect failed", "bg-green-600"),
      });
    },
    [allRooms, reconnectSensorMutation, toast]
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

  /**
   * Switch to the room's floor and select it (pinned residents, alerts on other floors).
   * Jumps to the grid view unless `keepView` (camera wall cards).
   */
  const focusRoom = useCallback((room: Room, keepView = false) => {
    setFloor(room.floor.id);
    setSelectedId(room.id);
    if (!keepView) setView("grid");
  }, []);

  /**
   * "View room" from the fall pop-up: go to the room's floor in grid view, make sure a
   * search isn't hiding it, then scroll its tile into view and flash it.
   */
  const revealRoom = useCallback(
    (room: Room) => {
      const q = query.trim().toLowerCase();
      if (q && !room.label.toLowerCase().includes(q) && !room.resident.toLowerCase().includes(q)) setQuery("");
      focusRoom(room);
      setHighlightId(room.id);
    },
    [query, focusRoom]
  );

  // Scroll to the highlighted tile once it's rendered, then stop flashing.
  useEffect(() => {
    if (!highlightId) return;
    const frame = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-room-id="${highlightId}"]`);
      el?.scrollIntoView?.({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    });
    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [highlightId, reduceMotion]);

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
      if (active && (active.tagName === "INPUT" || active.tagName === "SELECT" || active.tagName === "TEXTAREA")) return;
      const r = allRooms.find((x) => x.id === selectedId);
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
  }, [allRooms, selectedId, faRoomId, liveId, acknowledge]);

  /* ── Derived state ──────────────────────────────────────────────────── */

  const roomsOnFloor = useMemo(() => allRooms.filter((r) => r.floor.id === floor), [allRooms, floor]);

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

  const activeCountOnFloor = useMemo(() => roomsOnFloor.filter((r) => r.alertState === "active").length, [roomsOnFloor]);
  const clearCount = useMemo(() => roomsOnFloor.filter((r) => effState(r) === "idle").length, [roomsOnFloor]);
  const onlineCount = useMemo(() => roomsOnFloor.filter((r) => r.sensorStatus === "online").length, [roomsOnFloor]);
  const anySensorDown = useMemo(() => roomsOnFloor.some((r) => r.sensorStatus !== "online"), [roomsOnFloor]);

  const selectedRoom = useMemo(
    () => (selectedId ? allRooms.find((r) => r.id === selectedId && r.floor.id === floor) ?? null : null),
    [allRooms, selectedId, floor]
  );
  const liveRoom = useMemo(() => (liveId ? allRooms.find((r) => r.id === liveId) ?? null : null), [allRooms, liveId]);
  const faRoom = useMemo(() => (faRoomId ? allRooms.find((r) => r.id === faRoomId) ?? null : null), [allRooms, faRoomId]);
  const pinnedRooms = useMemo(
    () => pinned.map((id) => allRooms.find((r) => r.id === id)).filter((r): r is Room => Boolean(r)),
    [pinned, allRooms]
  );

  /** Oldest active fall anywhere — prefer one on the current floor. */
  const firstActiveRoom = useMemo(
    () => activeRooms.find((r) => r.floor.id === floor) ?? activeRooms[0] ?? null,
    [activeRooms, floor]
  );

  const jumpToFirstActiveAlert = useCallback(() => {
    if (firstActiveRoom) focusRoom(firstActiveRoom);
  }, [firstActiveRoom, focusRoom]);

  return {
    // raw state
    view,
    setView,
    floor,
    floorLabel: floors.find((f) => f.id === floor)?.label ?? "",
    query,
    setQuery,
    reducedMotion: reduceMotion,
    now,
    toasts,
    activity,
    searchInputRef,
    roomsLoading: roomsQuery.isPending,
    floors,

    // alarm
    sound,
    activeRooms,
    firstActiveRoom,

    // derived
    roomsOnFloor,
    sortedRooms,
    activeCountOnFloor,
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
    revealRoom,
    highlightId,
  };
}

export type UseLiveMonitorReturn = ReturnType<typeof useLiveMonitor>;
