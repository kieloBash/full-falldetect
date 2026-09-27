// location: frontend/components/live-monitor/LiveMonitor.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EnableSoundBar } from "@/components/alert-sound/EnableSoundBar";
import { useLiveMonitor, type UseLiveMonitorOptions } from "@/lib/live-monitor/useLiveMonitor";
import { ActiveAlertBanner } from "./ActiveAlertBanner";
import { CameraModal } from "./CameraModal";
import { CameraWall } from "./CameraWall";
import { FallAlertModal } from "./FallAlertModal";
import { FalseAlarmDialog } from "./FalseAlarmDialog";
import { Inspector } from "./Inspector";
import { RoomGrid } from "./RoomGrid";
import { Sidebar } from "./Sidebar";
import { ToastStack } from "./ToastStack";
import { Toolbar } from "./Toolbar";
import { TopBar } from "./TopBar";

export type LiveMonitorProps = UseLiveMonitorOptions;

/**
 * FallDetect — Live Monitor.
 *
 * The on-shift nurse's screen: every room on the selected floor as a live-status
 * tile (or live camera feeds for pinned rooms), the inspector for the selected room,
 * and the response flow — Acknowledge → Mark resolved, or Flag false alarm.
 * Falls on ANY floor raise the pop-up, the red banner and the looping alarm.
 */
export function LiveMonitor(props: LiveMonitorProps) {
  const m = useLiveMonitor(props);
  const activeCount = m.activeRooms.length;

  // The pop-up can be hidden, but comes back whenever a NEW fall is detected.
  const [modalDismissed, setModalDismissed] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const ids = m.activeRooms.map((r) => r.id);
    if (ids.some((id) => !seenIdsRef.current.has(id))) setModalDismissed(false);
    seenIdsRef.current = new Set(ids);
  }, [m.activeRooms]);

  const activeByFloor = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of m.activeRooms) counts[r.floor.id] = (counts[r.floor.id] ?? 0) + 1;
    return counts;
  }, [m.activeRooms]);

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans tabular-nums text-slate-900" style={{ background: "#F1F5F9" }}>
      <TopBar
        query={m.query}
        onQueryChange={m.setQuery}
        searchInputRef={m.searchInputRef}
        onSimulateFall={() => m.simulateFall()}
        onlineCount={m.onlineCount}
        totalCount={m.roomsOnFloor.length}
        anySensorDown={m.anySensorDown}
        alarm={{
          ringing: m.sound.ringing,
          snoozed: m.sound.snoozed,
          secondsLeft: m.sound.snoozeSecondsLeft,
          onSilence: m.sound.snooze,
        }}
      />

      {m.sound.blocked && <EnableSoundBar onEnable={m.sound.enable} />}

      <FallAlertModal
        activeCount={modalDismissed ? 0 : activeCount}
        activeRoom={m.firstActiveRoom}
        reducedMotion={m.reducedMotion}
        onJumpToAlert={() => {
          setModalDismissed(true);
          if (m.firstActiveRoom) m.revealRoom(m.firstActiveRoom);
        }}
        onAcknowledge={() => m.firstActiveRoom && m.acknowledge(m.firstActiveRoom.id)}
        onDismiss={() => setModalDismissed(true)}
      />
      <ActiveAlertBanner
        activeCount={activeCount}
        firstRoom={m.firstActiveRoom}
        currentFloorId={m.floor}
        reducedMotion={m.reducedMotion}
        // Reopen the fall pop-up (screenshot, confidence, Acknowledge) and go to its floor.
        onJumpToAlert={() => {
          m.jumpToFirstActiveAlert();
          setModalDismissed(false);
        }}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar pinnedRooms={m.pinnedRooms} onSelectPinnedRoom={(room) => m.focusRoom(room)} onUnpin={m.togglePin} />

        <main className="flex min-w-0 flex-1 flex-col">
          <Toolbar
            floor={m.floor ?? ""}
            roomCount={m.roomsOnFloor.length}
            view={m.view}
            onFloorChange={m.selectFloor}
            onViewChange={m.setView}
            floors={m.floors}
            activeByFloor={activeByFloor}
          />

          <div className="flex-1 overflow-auto" style={{ background: "#F1F5F9" }}>
            {!m.roomsLoading && m.floors.length === 0 && (
              <div className="px-6 py-10 text-center text-[13.5px] text-slate-500">
                No floors or rooms yet. An administrator can add them in Administration.
              </div>
            )}
            {m.view === "grid" && (
              <RoomGrid
                rooms={m.sortedRooms}
                now={m.now}
                selectedId={m.selectedRoom?.id ?? null}
                highlightedId={m.highlightId}
                reducedMotion={m.reducedMotion}
                onSelect={m.selectRoom}
                onAcknowledge={m.acknowledge}
                onFlagFalseAlarm={m.openFalseAlarmDialog}
                onResolve={m.resolve}
                onClearSearch={m.clearSearch}
              />
            )}
            {m.view === "wall" && (
              <CameraWall
                rooms={m.pinnedRooms}
                now={m.now}
                reducedMotion={m.reducedMotion}
                onSelect={(id) => {
                  const room = m.pinnedRooms.find((r) => r.id === id);
                  if (room) m.focusRoom(room, true);
                }}
                onExpand={m.openCameraModal}
                onAcknowledge={m.acknowledge}
                onFlagFalseAlarm={m.openFalseAlarmDialog}
                onResolve={m.resolve}
              />
            )}
          </div>
        </main>

        <aside className="w-[360px] flex-none overflow-y-auto border-l border-slate-200 bg-white">
          <Inspector
            room={m.selectedRoom}
            floorLabel={m.floorLabel ? `Floor ${m.floorLabel}` : ""}
            pinned={m.selectedRoom ? m.isPinned(m.selectedRoom.id) : false}
            activeCount={m.activeCountOnFloor}
            clearCount={m.clearCount}
            activity={m.activity}
            now={m.now}
            onClose={m.clearSelection}
            onAcknowledge={() => m.selectedRoom && m.acknowledge(m.selectedRoom.id)}
            onFlagFalseAlarm={() => m.selectedRoom && m.openFalseAlarmDialog(m.selectedRoom.id)}
            onResolve={() => m.selectedRoom && m.resolve(m.selectedRoom.id)}
            onReconnect={() => m.selectedRoom && m.reconnectSensor(m.selectedRoom.id)}
            onLiveView={() => m.selectedRoom && m.openCameraModal(m.selectedRoom.id)}
            onTogglePin={() => m.selectedRoom && m.togglePin(m.selectedRoom.id)}
          />
        </aside>
      </div>

      {m.faRoom && <FalseAlarmDialog room={m.faRoom} onCancel={m.cancelFalseAlarm} onConfirm={m.confirmFalseAlarm} />}
      {m.liveRoom && <CameraModal room={m.liveRoom} now={m.now} reducedMotion={m.reducedMotion} onClose={m.closeCameraModal} />}

      <ToastStack toasts={m.toasts} />
    </div>
  );
}
