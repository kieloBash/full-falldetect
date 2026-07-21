import type { SensorStatus } from "./types";

interface SensorStatusMeta {
  label: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  dotClass: string;
}

/**
 * The Admin screen's design calls the "degraded" tier "Warning" and shows
 * status as a plain colored pill (no icon), unlike Live Monitor's
 * icon+text StatusBadge — same underlying `SensorStatus`, different
 * presentation per screen.
 */
export const ADMIN_SENSOR_STATUS_META: Record<SensorStatus, SensorStatusMeta> = {
  online: { label: "Online", textClass: "text-green-600", bgClass: "bg-green-50", borderClass: "border-green-200", dotClass: "bg-green-600" },
  degraded: { label: "Warning", textClass: "text-amber-600", bgClass: "bg-amber-50", borderClass: "border-amber-200", dotClass: "bg-amber-600" },
  offline: { label: "Offline", textClass: "text-red-600", bgClass: "bg-red-50", borderClass: "border-red-200", dotClass: "bg-red-600" },
};

export const SENSOR_STATUS_OPTIONS: { value: SensorStatus; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "degraded", label: "Warning" },
  { value: "offline", label: "Offline" },
];

export const COPY = {
  badge: "Admin",
  breadcrumbBase: "Sunrise Wing",
  pageTitle: "Floor Management",
  floorCountLine: (count: number) => `${count} floor${count === 1 ? "" : "s"} across your facility`,
  addFloor: "Add floor",
  addRoom: "Add room",
  roomTableSubtitle: "Rooms, residents, and sensor assignments for this floor",
  noRooms: "No rooms on this floor yet.",
  vacant: "Vacant",
  floorModalTitle: "Add floor",
  roomModalTitleAdd: "Add room",
  roomModalTitleEdit: "Edit room",
  roomModalSaveAdd: "Add room",
  roomModalSaveEdit: "Save changes",
} as const;

/** Shared grid-column template for the rooms table's header row and each RoomRow, so they can't drift out of alignment. */
export const ROOM_TABLE_GRID_COLS = "grid-cols-[70px_1fr_110px_100px_76px]";

export const ADMIN_NAV = {
  monitoring: [
    { key: "live-monitor", label: "Live Monitor", icon: "grid", href: "/live-monitor" },
    { key: "incidents", label: "Incidents", icon: "fileText", href: null },
  ],
  administration: [
    { key: "floor-management", label: "Floor Management", icon: "building", href: "/admin", active: true },
    { key: "users", label: "Users", icon: "users", comingSoon: true },
    { key: "sensors", label: "Sensors", icon: "sensors", comingSoon: true },
    { key: "settings", label: "Settings", icon: "settings", comingSoon: true },
  ],
} as const;
