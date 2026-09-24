// location: frontend/lib/detection-node/useDetectionNodes.ts
// Screen state for /admin/detection-nodes, composed from the query hooks.
"use client";

import { useMemo, useState } from "react";
import { useDeleteDetectionNodeMutation, useDetectionNodesQuery } from "./queries";
import type { DetectionNode } from "./types";

export function useDetectionNodes() {
  const nodesQuery = useDetectionNodesQuery();
  const deleteMutation = useDeleteDetectionNodeMutation();
  const [previewDeviceId, setPreviewDeviceId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DetectionNode | null>(null);

  const nodes = useMemo(() => nodesQuery.data ?? [], [nodesQuery.data]);

  const summary = useMemo(() => {
    const cameras = nodes.flatMap((n) => n.cameras);
    return {
      nodesOnline: nodes.filter((n) => n.online).length,
      nodesTotal: nodes.length,
      camerasOnline: cameras.filter((c) => c.status === "online").length,
      camerasTotal: cameras.length,
    };
  }, [nodes]);

  const requestDelete = (node: DetectionNode) => {
    deleteMutation.reset();
    setPendingDelete(node);
  };

  const cancelDelete = () => setPendingDelete(null);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const removed = pendingDelete;
    deleteMutation.mutate(removed.id, {
      onSuccess: () => {
        setPendingDelete(null);
        if (removed.cameras.some((c) => c.deviceId === previewDeviceId)) setPreviewDeviceId(null);
      },
    });
  };

  return {
    nodes,
    summary,
    isLoading: nodesQuery.isPending,
    error: nodesQuery.error,
    refetch: nodesQuery.refetch,
    previewDeviceId,
    openPreview: setPreviewDeviceId,
    closePreview: () => setPreviewDeviceId(null),
    pendingDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}
