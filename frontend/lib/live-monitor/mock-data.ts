import { BADGE_META, BADGE_VARIANT_BY_STATE } from "./constants";
import type { EffectiveState, History, Room } from "./types";
import { formatDateHistory, formatHistoryMessage } from "./utils";

type RoomSeed = readonly [id: string, resident: string, risk: Room["risk"], sensorStatus: Room["sensorStatus"], zone: string];

const FLOOR_2: readonly RoomSeed[] = [
  ["201", "Margaret Chen", "high", "online", "A"],
  ["202", "Harold Weiss", "medium", "online", "A"],
  ["203", "Dorothy Alvarez", "low", "online", "A"],
  ["204", "James Okonkwo", "medium", "online", "A"],
  ["205", "Evelyn Park", "high", "online", "A"],
  ["206", "Frank Delgado", "low", "online", "B"],
  ["207", "Rose Kaminski", "medium", "online", "B"],
  ["208", "Walter Nguyen", "low", "degraded", "B"],
  ["209", "Beatrice Lund", "high", "online", "B"],
  ["210", "Arthur Pena", "medium", "online", "A"],
  ["211", "Gloria Simmons", "low", "online", "A"],
  ["212", "Henry Tanaka", "high", "online", "A"],
  ["213", "Mabel Foster", "low", "online", "A"],
  ["214", "Clara Whitfield", "medium", "online", "A"],
  ["215", "Samuel Brooks", "low", "online", "B"],
  ["216", "Irene Costa", "medium", "online", "B"],
  ["217", "Leonard Hayes", "low", "offline", "B"],
  ["218", "Vera Osei", "high", "online", "B"],
];

const FLOOR_3: readonly RoomSeed[] = [
  ["301", "Nora Bradley", "low", "online", "A"],
  ["302", "Cecil Adams", "medium", "online", "A"],
  ["303", "Pearl Nakamura", "high", "online", "A"],
  ["304", "Otis Reyna", "low", "online", "A"],
  ["305", "Ada Munoz", "medium", "online", "B"],
  ["306", "Roy Fielding", "low", "online", "B"],
  ["307", "Sylvia Trent", "low", "degraded", "B"],
  ["308", "Marcus Webb", "medium", "online", "B"],
];

export const INITIAL_PINNED_ROOM_IDS = ["201", "218"];

export const INITIAL_ACTIVITY = [
  { id: "a1", text: "Shift started — 48 residents monitored", when: "6:00 PM", color: "bg-teal-600" },
  { id: "a2", text: "Sensor 217 went offline", when: "5:12 PM", color: "bg-slate-400" },
  { id: "a3", text: "Sensor 208 reporting degraded signal", when: "4:48 PM", color: "bg-amber-600" },
];

interface HistoryEntry {
  text: string;
  when: string;
  color: string;
}

/**
 * Per-resident incident history shown in the inspector, keyed off risk tier
 * for demo purposes.
 * TODO(api): replace with `GET /residents/{id}/incidents?limit=`.
 */
export function historyForRisk(history: History[]): HistoryEntry[] {

  return history.map((h) => {
    const badge = h.state.split("_").join("").toLowerCase() as EffectiveState;
    const color = BADGE_META[BADGE_VARIANT_BY_STATE[badge]].bgClass

    return {
      text: formatHistoryMessage(h),
      when: formatDateHistory(h.detectedAt as string),
      color: color,
    }
  })
}
