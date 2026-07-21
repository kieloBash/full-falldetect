"use client";

import { useLiveMonitor, type UseLiveMonitorOptions } from "@/lib/live-monitor/useLiveMonitor";
import { ActiveAlertBanner } from "./ActiveAlertBanner";
import { CameraModal } from "./CameraModal";
import { CameraWall } from "./CameraWall";
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
 * The on-shift nurse's default landing screen: every monitored room as a
 * live-status tile (or, in Camera wall view, a live CCTV feed for pinned
 * rooms), a right-hand inspector for the selected room, and the full
 * fall-response lifecycle — Acknowledge → Mark resolved, or Flag false alarm
 * with a required reason.
 *
 * Fully self-contained client component: render `<LiveMonitor />` and it
 * owns its own state via `useLiveMonitor`. Swap the mock data layer for a
 * real one by editing `lib/live-monitor/mock-data.ts` and the `TODO(api)`
 * markers in `lib/live-monitor/useLiveMonitor.ts`.
 */
export function LiveMonitor(props: LiveMonitorProps) {
  const m = useLiveMonitor(props);

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans tabular-nums text-slate-900" style={{ background: "#F1F5F9" }}>
      <TopBar
        floor={m.floor ?? ""}
        query={m.query}
        onQueryChange={m.setQuery}
        searchInputRef={m.searchInputRef as any}
        muted={m.muted}
        onToggleMuted={m.toggleMuted}
        onSimulateFall={() => m.simulateFall()}
        onlineCount={m.onlineCount}
        totalCount={m.roomsOnFloor.length}
        anySensorDown={m.anySensorDown}
      />

      <ActiveAlertBanner activeCount={m.activeCount} reducedMotion={m.reducedMotion} onJumpToAlert={m.jumpToFirstActiveAlert} />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          pinnedRooms={m.pinnedRooms}
          onSelectPinnedRoom={m.focusRoom}
          onUnpin={m.togglePin}
          onNavigateOutOfScope={m.notifyOutOfScope}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <Toolbar
            floor={m.floor ?? ""}
            roomCount={m.roomsOnFloor.length}
            view={m.view}
            onFloorChange={m.selectFloor}
            onViewChange={m.setView}
            floors={m.floors}
          />

          <div className="flex-1 overflow-auto" style={{ background: "#F1F5F9" }}>
            {m.view === "grid" && (
              <RoomGrid
                rooms={m.sortedRooms}
                now={m.now}
                selectedId={m.selectedRoom?.id ?? null}
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
                onSelect={m.selectRoom}
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
            floorLabel={`Floor ${m.floor}`}
            pinned={m.selectedRoom ? m.isPinned(m.selectedRoom.id) : false}
            activeCount={m.activeCount}
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
