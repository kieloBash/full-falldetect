import type { Floor, Patient, Room } from "./types";

/**
 * Seed data for the demo/prototype, translated from the design's inline
 * state. "warning" in the original design maps to `SensorStatus`'s
 * "degraded" (see constants.ts) so this feature shares one sensor-status
 * enum with Live Monitor instead of introducing a second one.
 * TODO(api): replace with GET /admin/floors, GET /admin/rooms, GET /admin/patients.
 */

export function buildFloors(): Floor[] {
  return [
    { id: "f2", name: "Floor 2", wing: "Sunrise Wing" },
    { id: "f3", name: "Floor 3", wing: "Sunrise Wing" },
    { id: "f4", name: "Floor 4", wing: "Oakwood Wing" },
  ];
}

export function buildRooms(): Room[] {
  return [
    { id: "r201", room: "201", floorId: "f2", sensorId: "SNR-201", status: "online" },
    { id: "r202", room: "202", floorId: "f2", sensorId: "SNR-202", status: "online" },
    { id: "r203", room: "203", floorId: "f2", sensorId: "SNR-203", status: "offline" },
    { id: "r204", room: "204", floorId: "f2", sensorId: "SNR-204", status: "degraded" },
    { id: "r205", room: "205", floorId: "f2", sensorId: "SNR-205", status: "online" },
    { id: "r301", room: "301", floorId: "f3", sensorId: "SNR-301", status: "online" },
    { id: "r302", room: "302", floorId: "f3", sensorId: "SNR-302", status: "online" },
    { id: "r303", room: "303", floorId: "f3", sensorId: "SNR-303", status: "online" },
    { id: "r401", room: "401", floorId: "f4", sensorId: "SNR-401", status: "degraded" },
    { id: "r402", room: "402", floorId: "f4", sensorId: "SNR-402", status: "online" },
  ];
}

export function buildPatients(): Patient[] {
  return [
    { id: "p1", name: "Eleanor Voss", roomId: "r201", notes: "Fall risk — uses walker.", discharged: false },
    { id: "p2", name: "Harold Kim", roomId: "r202", notes: "Diabetic, insulin schedule on file.", discharged: false },
    { id: "p3", name: "Miriam Cole", roomId: "r204", notes: "Hard of hearing, prefers visual alerts.", discharged: false },
    { id: "p4", name: "David Okafor", roomId: "r205", notes: "", discharged: false },
    { id: "p5", name: "Grace Lin", roomId: "r301", notes: "Recovering from hip surgery.", discharged: false },
    { id: "p6", name: "Walter Reyes", roomId: "r303", notes: "", discharged: false },
    { id: "p7", name: "Patricia Nunez", roomId: "r401", notes: "High fall risk, bed alarm active.", discharged: false },
    { id: "p8", name: "Samuel Ortiz", roomId: "r402", notes: "", discharged: false },
  ];
}
