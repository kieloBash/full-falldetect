"use client";

import { COPY } from "@/lib/admin/constants";
import { useRoomManagement } from "@/lib/admin/useRoomManagement";
import { AddEditRoomModal } from "./AddEditRoomModal";
import { AdminSidebar } from "./AdminSidebar";
import { AdminToolbar } from "./AdminToolbar";
import { AdminTopBar } from "./AdminTopBar";
import { RoomManagementTable } from "./RoomManagementTable";

/**
 * FallDetect — Admin · Room Management (`/admin/rooms`).
 *
 * Every room across every floor, with its floor and currently assigned
 * patient, plus add/edit/remove. Backed by TanStack Query, mock-backed for
 * now. Fully self-contained: render `<RoomManagementScreen />` and it owns
 * its own state via `useRoomManagement`.
 */
export function RoomManagementScreen() {
  const room = useRoomManagement();

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans tabular-nums text-slate-900" style={{ background: "#F1F5F9" }}>
      <AdminTopBar />

      <div className="flex min-h-0 flex-1">
        <AdminSidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <AdminToolbar
            title={COPY.room.title}
            subtitle={COPY.room.countLine(room.roomRows.length, room.floorCount)}
            actionLabel={COPY.room.addRoom}
            onAction={room.openAddRoomModal}
          />

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <RoomManagementTable rows={room.roomRows} onEditRoom={room.openEditRoomModal} onRemoveRoom={room.removeRoom} />
          </div>
        </main>
      </div>

      {room.roomModalOpen && (
        <AddEditRoomModal
          values={room.roomForm}
          floors={room.floors}
          onFieldChange={room.updateRoomFormField}
          isEditing={room.isEditingRoom}
          onCancel={room.closeRoomModal}
          onSave={room.saveRoom}
          saving={room.savingRoom}
        />
      )}
    </div>
  );
}
