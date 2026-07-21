"use client";

import { useAdminFloors } from "@/lib/admin/useAdminFloors";
import { AddEditRoomModal } from "./AddEditRoomModal";
import { AddFloorModal } from "./AddFloorModal";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";
import { FloorList } from "./FloorList";
import { FloorManagementToolbar } from "./FloorManagementToolbar";
import { RoomTable } from "./RoomTable";

/**
 * FallDetect — Admin · Floor Management.
 *
 * Lets an admin manage the org structure Live Monitor visualizes: floors,
 * rooms, and their sensor assignments. A CRUD table + two modals, backed by
 * TanStack Query mutations that invalidate-and-refetch on success (see
 * `lib/admin/queries.ts`) rather than Live Monitor's optimistic local
 * state — the right call for an admin screen where a few hundred ms of
 * round-trip latency is fine.
 *
 * Fully self-contained: render `<AdminScreen />` and it owns its own state
 * via `useAdminFloors`.
 */
export function AdminScreen() {
  const admin = useAdminFloors();

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans tabular-nums text-slate-900" style={{ background: "#F1F5F9" }}>
      <AdminTopBar />

      <div className="flex min-h-0 flex-1">
        <AdminSidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <FloorManagementToolbar floorCount={admin.floors.length} onAddFloor={admin.openAddFloorModal} />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <FloorList floors={admin.floors} floorCards={[]} selectedFloorId={admin.selectedFloor?.id ?? null} onSelectFloor={admin.selectFloor} />

            {admin.selectedFloor && (
              <RoomTable
                floor={admin.selectedFloor as any}
                onAddRoom={admin.openAddRoomModal}
                onEditRoom={admin.openEditRoomModal}
                onRemoveRoom={admin.removeRoom}
              />
            )}
          </div>
        </main>
      </div>

      {admin.floorModalOpen && (
        <AddFloorModal
          name={admin.newFloorName}
          onNameChange={admin.setNewFloorName}
          wing={admin.newFloorWing}
          onWingChange={admin.setNewFloorWing}
          onCancel={admin.closeFloorModal}
          onSave={admin.saveFloor}
          saving={admin.savingFloor}
        />
      )}

      {admin.roomModalOpen && (
        <AddEditRoomModal
          floors={admin.floors}
          values={admin.roomForm}
          onFieldChange={admin.updateRoomFormField}
          isEditing={admin.isEditingRoom}
          onCancel={admin.closeRoomModal}
          onSave={admin.saveRoom}
          saving={admin.savingRoom}
        />
      )}
    </div>
  );
}
