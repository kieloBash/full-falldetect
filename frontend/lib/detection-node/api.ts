// location: frontend/lib/detection-node/api.ts
// One function per endpoint. apiClient throws ApiError on non-2xx.
import { apiClient } from "@/lib/api/client";
import type { DetectionNode, StreamAccess } from "./types";

export async function fetchDetectionNodes(): Promise<DetectionNode[]> {
  const { data } = await apiClient.get<DetectionNode[]>("/detection-nodes");
  return data;
}

export async function deleteDetectionNode(nodeId: string): Promise<void> {
  await apiClient.delete(`/detection-nodes/${encodeURIComponent(nodeId)}`);
}

export async function fetchStreamAccess(deviceId: string): Promise<StreamAccess> {
  const { data } = await apiClient.get<StreamAccess>("/stream-token", { params: { deviceId } });
  return data;
}
