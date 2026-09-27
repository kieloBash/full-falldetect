// location: frontend/components/admin/FloorManagementScreen.tsx
"use client";

import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/admin/constants";
import { useFloorManagement } from "@/lib/admin/useFloorManagement";
import { AdminSidebar } from "./AdminSidebar";
import { AdminToolbar } from "./AdminToolbar";
import { AdminTopBar } from "./AdminTopBar";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { FloorList } from "./FloorList";
import { FloorModal } from "./FloorModal";
import { FloorRoomsTable } from "./FloorRoomsTable";

/**
 * FallDetect — Admin · Floor Management (`/admin`).
 *
 * Floor list on the left; the selected floor's rooms (read-only — room CRUD
 * lives on `/admin/rooms`) on the right, with Rename and Delete for the
 * selected floor. State lives in `useFloorManagement`.
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

          {!floor.loading && floor.floors.length === 0 ? (
            <div data-testid="floors-empty" className="px-6 py-10 text-center text-[13.5px] text-slate-500">
              {COPY.floor.noFloors}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <FloorList
                floors={floor.floors}
                floorCards={floor.floorCards}
                selectedFloorId={floor.selectedFloor?.id ?? null}
                onSelectFloor={floor.selectFloor}
              />

              {floor.selectedFloor && (
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <div className="mb-[14px] flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold">
                        {floor.selectedFloor.name}
                        <span className="font-medium text-slate-400"> — {floor.selectedFloor.wing}</span>
                      </div>
                      <div className="mt-[2px] text-[12.5px] text-slate-600">{COPY.floor.tableSubtitle}</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={floor.openEditFloorModal}>
                      {COPY.floor.rename}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={floor.requestDeleteFloor}>
                      {COPY.floor.delete}
                    </Button>
                  </div>

                  <FloorRoomsTable rows={floor.selectedFloorRoomRows} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {floor.floorModalOpen && (
        <FloorModal
          isEditing={floor.isEditingFloor}
          name={floor.floorName}
          onNameChange={floor.setFloorName}
          error={floor.formError}
          onCancel={floor.closeFloorModal}
          onSave={floor.saveFloor}
          saving={floor.savingFloor}
        />
      )}

      <ConfirmDeleteDialog
        target={floor.deleteTarget}
        busy={floor.deletingFloor}
        error={floor.deleteError}
        onCancel={floor.cancelDeleteFloor}
        onConfirm={floor.confirmDeleteFloor}
      />
    </div>
  );
}
