// location: frontend/lib/detection-node/types.ts
// UI-facing types for the Remote Detection Node module.

export type SensorStatus = "online" | "degraded" | "offline";

export type NodeCamera = {
  sensorId: string;
  deviceId: string;
  roomLabel: string;
  floorLabel: string;
  status: SensorStatus;
  lastSeenAt: string | null;
};

export type DetectionNode = {
  id: string;
  nodeKey: string;
  name: string;
  online: boolean;
  /** e.g. "http://192.168.1.50:8002", reported by the camera laptop's heartbeat */
  streamBaseUrl: string | null;
  lastHeartbeatAt: string | null;
  cameras: NodeCamera[];
};

export type StreamUnavailableReason = "no_node" | "node_offline" | "camera_offline";

export type StreamAccess =
  | {
      deviceId: string;
      online: true;
      streamUrl: string;
      expiresAt: string;
    }
  | {
      deviceId: string;
      online: false;
      reason: StreamUnavailableReason;
      lastHeartbeatAt: string | null;
    };
