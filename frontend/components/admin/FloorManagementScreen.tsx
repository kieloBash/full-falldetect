"use client";

import { COPY } from "@/lib/admin/constants";
import { useFloorManagement } from "@/lib/admin/useFloorManagement";
import { AddFloorModal } from "./AddFloorModal";
import { AdminSidebar } from "./AdminSidebar";
import { AdminToolbar } from "./AdminToolbar";
import { AdminTopBar } from "./AdminTopBar";
import { FloorList } from "./FloorList";
import { FloorRoomsTable } from "./FloorRoomsTable";

/**
 * FallDetect — Admin · Floor Management (`/admin`).
 *
 * Floor list on the left; the selected floor's rooms — read-only, room
 * CRUD lives on `/admin/rooms` — on the right. Backed by TanStack Query
 * (see `lib/admin/queries.ts`), mock-backed for now. Fully self-contained:
 * render `<FloorManagementScreen />` and it owns its own state via
 * `useFloorManagement`.
 */
export function FloorManagementScreen() {
  const floor = useFloorManagement();

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans tabular-nums text-slate-900" style={{ background: "#F1F5F9" }}>
      <AdminTopBar />

      <div className="flex min-h-0 flex-1">
        <AdminSidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <AdminToolbar
            title={COPY.floor.title}
            subtitle={COPY.floor.countLine(floor.floors.length)}
            actionLabel={COPY.floor.addFloor}
            onAction={floor.openAddFloorModal}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <FloorList floors={[]} floorCards={floor.floorCards} selectedFloorId={floor.selectedFloor?.id ?? null} onSelectFloor={floor.selectFloor} />

            {floor.selectedFloor && (
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="mb-[14px]">
                  <div className="text-base font-semibold">
                    {floor.selectedFloor.name}
                    <span className="font-medium text-slate-400"> — {floor.selectedFloor.wing}</span>
                  </div>
                  <div className="mt-[2px] text-[12.5px] text-slate-600">{COPY.floor.tableSubtitle}</div>
                </div>

                <FloorRoomsTable rows={floor.selectedFloorRoomRows} />
              </div>
            )}
          </div>
        </main>
      </div>

      {floor.floorModalOpen && (
        <AddFloorModal
          name={floor.newFloorName}
          onNameChange={floor.setNewFloorName}
          wing={floor.newFloorWing}
          onWingChange={floor.setNewFloorWing}
          onCancel={floor.closeFloorModal}
          onSave={floor.saveFloor}
          saving={floor.savingFloor}
        />
      )}
    </div>
  );
}
