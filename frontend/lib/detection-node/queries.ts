// location: frontend/lib/detection-node/queries.ts
// Query keys, useQuery / useMutation hooks, and cache invalidation.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteDetectionNode, fetchDetectionNodes, fetchStreamAccess } from "./api";
import { NODES_REFRESH_MS, OFFLINE_RECHECK_MS } from "./constants";

export const detectionNodeKeys = {
  all: ["detection-nodes"] as const,
  list: () => [...detectionNodeKeys.all, "list"] as const,
  stream: (deviceId: string) => [...detectionNodeKeys.all, "stream", deviceId] as const,
};

export function useDetectionNodesQuery() {
  return useQuery({
    queryKey: detectionNodeKeys.list(),
    queryFn: fetchDetectionNodes,
    refetchInterval: NODES_REFRESH_MS,
  });
}

/**
 * Stream URL + short-lived token for one camera. Not cached between mounts.
 * - Online: fetched once; refetched only when the <img> errors (see useRemoteCameraFeed),
 *   which also picks up a new IP if the camera laptop's address changed.
 * - Offline: re-checked periodically so the feed recovers on its own.
 */
export function useStreamAccessQuery(deviceId: string | null) {
  return useQuery({
    queryKey: detectionNodeKeys.stream(deviceId ?? ""),
    queryFn: () => fetchStreamAccess(deviceId as string),
    enabled: Boolean(deviceId),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (query.state.data && !query.state.data.online ? OFFLINE_RECHECK_MS : false),
  });
}

export function useDeleteDetectionNodeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDetectionNode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detectionNodeKeys.all });
      // Sensor status in the Live Monitor depends on nodes.
      queryClient.invalidateQueries({ queryKey: ["live-monitor", "rooms"] });
    },
  });
}
