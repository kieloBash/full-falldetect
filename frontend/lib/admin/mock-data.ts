import type { AdminFloor } from "./types";

/**
 * Seed data for the demo/prototype, translated from the design's inline
 * state. "warning" in the original design maps to `SensorStatus`'s
 * "degraded" (see constants.ts) so this screen shares one sensor-status
 * enum with Live Monitor instead of introducing a second one.
 * TODO(api): replace with `GET /admin/floors`.
 */
export function buildFloors(): AdminFloor[] {
  return [
    {
      id: "floor-2",
      name: "Floor 2",
      wing: "Sunrise Wing",
      rooms: [
        { id: "room-201", room: "201", resident: "Eleanor Voss", sensorId: "SNR-201", status: "online" },
        { id: "room-202", room: "202", resident: "Harold Kim", sensorId: "SNR-202", status: "online" },
        { id: "room-203", room: "203", resident: "", sensorId: "SNR-203", status: "offline" },
        { id: "room-204", room: "204", resident: "Miriam Cole", sensorId: "SNR-204", status: "degraded" },
        { id: "room-205", room: "205", resident: "David Okafor", sensorId: "SNR-205", status: "online" },
      ],
    },
    {
      id: "floor-3",
      name: "Floor 3",
      wing: "Sunrise Wing",
      rooms: [
        { id: "room-301", room: "301", resident: "Grace Lin", sensorId: "SNR-301", status: "online" },
        { id: "room-302", room: "302", resident: "", sensorId: "SNR-302", status: "online" },
        { id: "room-303", room: "303", resident: "Walter Reyes", sensorId: "SNR-303", status: "online" },
      ],
    },
    {
      id: "floor-4",
      name: "Floor 4",
      wing: "Oakwood Wing",
      rooms: [
        { id: "room-401", room: "401", resident: "Patricia Nunez", sensorId: "SNR-401", status: "degraded" },
        { id: "room-402", room: "402", resident: "Samuel Ortiz", sensorId: "SNR-402", status: "online" },
      ],
    },
  ];
}
