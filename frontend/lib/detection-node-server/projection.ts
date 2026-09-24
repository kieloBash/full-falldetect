// location: frontend/lib/detection-node-server/projection.ts
// Maps DetectionNode rows to the UI shape, like projectRoom() does for rooms (TDS §8.4).
import "server-only";
import type { DetectionNode } from "@/lib/detection-node/types";
import { effectiveSensorStatus, isNodeOnline } from "./status";

/** Pass to prisma.detectionNode.findMany({ include: nodeInclude }). */
export const nodeInclude = {
  sensors: {
    orderBy: { deviceId: "asc" as const },
    include: {
      room: { select: { label: true, floor: { select: { label: true } } } },
    },
  },
};

type NodeRow = {
  id: string;
  nodeKey: string;
  name: string;
  streamBaseUrl: string | null;
  lastHeartbeatAt: Date | null;
  sensors: {
    id: string;
    deviceId: string | null;
    status: string;
    nodeId: string | null;
    lastSeenAt: Date | null;
    room: { label: string; floor: { label: string } };
  }[];
};

export function projectNode(node: NodeRow, now = Date.now()): DetectionNode {
  const online = isNodeOnline(node.lastHeartbeatAt, now);
  return {
    id: node.id,
    nodeKey: node.nodeKey,
    name: node.name,
    online,
    streamBaseUrl: node.streamBaseUrl,
    lastHeartbeatAt: node.lastHeartbeatAt?.toISOString() ?? null,
    cameras: node.sensors.map((s) => ({
      sensorId: s.id,
      deviceId: s.deviceId ?? "(no device ID)",
      roomLabel: s.room.label,
      floorLabel: s.room.floor.label,
      status: online ? effectiveSensorStatus(s, now) : "offline",
      lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
    })),
  };
}
