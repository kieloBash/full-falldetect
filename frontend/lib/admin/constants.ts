import type { SensorStatus } from "./types";

interface PillMeta {
  label: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
}

/**
 * The Admin design calls the "degraded" tier "Warning" and shows status as
 * a plain colored pill (no icon), unlike Live Monitor's icon+text
 * StatusBadge — same underlying `SensorStatus`, different presentation.
 */
export const SENSOR_STATUS_META: Record<SensorStatus, PillMeta> = {
  online: { label: "Online", textClass: "text-green-600", bgClass: "bg-green-50", borderClass: "border-green-200" },
  degraded: { label: "Warning", textClass: "text-amber-600", bgClass: "bg-amber-50", borderClass: "border-amber-200" },
  offline: { label: "Offline", textClass: "text-red-600", bgClass: "bg-red-50", borderClass: "border-red-200" },
};

export const PATIENT_STATUS_META: Record<"active" | "discharged", PillMeta> = {
  active: { label: "Active", textClass: "text-green-600", bgClass: "bg-green-50", borderClass: "border-green-200" },
  discharged: { label: "Discharged", textClass: "text-slate-500", bgClass: "bg-slate-100", borderClass: "border-slate-200" },
};

/** Grid-column templates shared between each table's header row and its rows, so they can't drift apart. */
export const FLOOR_ROOMS_GRID_COLS = "grid-cols-[70px_1fr_110px_100px]";
export const ROOM_MGMT_GRID_COLS = "grid-cols-[90px_130px_1fr_130px_80px]";
export const PATIENT_TABLE_GRID_COLS = "grid-cols-[1fr_110px_1fr_100px_80px]";

export const COPY = {
  badge: "Admin",
  breadcrumbBase: "Sunrise Wing",
  vacant: "Vacant",
  unassigned: "Unassigned",

  floor: {
    title: "Floor Management",
    countLine: (n: number) => `${n} floor${n === 1 ? "" : "s"} across your facility`,
    addFloor: "Add floor",
    tableSubtitle: "Rooms, residents, and sensor assignments for this floor",
    noRooms: "No rooms on this floor yet. Add rooms from Room Management.",
    modalTitle: "Add floor",
  },

  room: {
    title: "Room Management",
    countLine: (rooms: number, floors: number) => `${rooms} room${rooms === 1 ? "" : "s"} across ${floors} floor${floors === 1 ? "" : "s"}`,
    addRoom: "Add room",
    noRooms: "No rooms yet.",
    modalTitleAdd: "Add room",
    modalTitleEdit: "Edit room",
    modalSaveAdd: "Add room",
    modalSaveEdit: "Save changes",
    tableTitle: "Room Table",
  },

  patient: {
    title: "Patient Management",
    countLine: (n: number) => `${n} active patient${n === 1 ? "" : "s"}`,
    addPatient: "Add patient",
    noPatients: "No patients yet.",
    modalTitleAdd: "Add patient",
    modalTitleEdit: "Edit patient",
    modalSaveAdd: "Add patient",
    modalSaveEdit: "Save changes",
    dischargeCheckboxLabel: "Mark as discharged",
    removeTooltip: "Discharge / remove patient",
  },
} as const;

export const ADMIN_MONITORING_NAV = [
  { key: "live-monitor", label: "Live Monitor", icon: "grid", href: "/live-monitor" },
  { key: "incidents", label: "Incidents", icon: "fileText", href: null },
] as const;

/**
 * The three Admin routes, each its own page — not switchable views in one
 * screen. `AdminSidebar`/`AdminTopBar` derive the active item and
 * breadcrumb label from `usePathname()` against this list.
 */
export const ADMIN_ROUTES = [
  { key: "floors", label: "Floor Management", icon: "building", path: "/admin" },
  { key: "rooms", label: "Room Management", icon: "rooms", path: "/admin/rooms" },
  { key: "patients", label: "Patient Management", icon: "users", path: "/admin/patients" },
] as const;

export const ADMIN_SOON_NAV = [
  { key: "users", label: "Users", icon: "users" },
  { key: "settings", label: "Settings", icon: "settings" },
] as const;
