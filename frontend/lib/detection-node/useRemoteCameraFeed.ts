// location: frontend/lib/detection-node/useRemoteCameraFeed.ts
// State machine for one camera feed served by the camera laptop over the LAN.
// <img src=streamUrl> plays the MJPEG stream; on error we wait, fetch a fresh token
// (and the laptop's current IP), and retry.
"use client";

import { useCallback, useEffect, useState } from "react";
import { useStreamAccessQuery } from "./queries";
import { MAX_FEED_FAILURES, RECONNECT_DELAY_MS } from "./constants";
import type { StreamUnavailableReason } from "./types";
import { timeAgo } from "./utils";

export type FeedState =
  | { kind: "loading" }
  | { kind: "offline"; message: string }
  | { kind: "error"; message: string }
  | { kind: "live"; src: string };

function offlineMessage(reason: StreamUnavailableReason, lastHeartbeatAt: string | null): string {
  switch (reason) {
    case "no_node":
      return "No camera laptop is reporting this camera yet.";
    case "node_offline":
      return `The camera laptop is offline. Last heard from ${timeAgo(lastHeartbeatAt)}.`;
    case "camera_offline":
      return "The camera laptop is online, but this camera isn't sending frames.";
  }
}

/** Mount with key={deviceId} so state resets when the camera changes. */
export function useRemoteCameraFeed(deviceId: string | null) {
  const access = useStreamAccessQuery(deviceId);
  const { data, refetch } = access;
  const [failures, setFailures] = useState(0);

  useEffect(() => {
    if (!data?.online || failures === 0 || failures > MAX_FEED_FAILURES) return;
    const timer = setTimeout(() => void refetch(), RECONNECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [failures, data, refetch]);

  const onImageError = useCallback(() => setFailures((f) => f + 1), []);
  const onImageLoad = useCallback(() => setFailures(0), []);
  const retry = useCallback(() => {
    setFailures(0);
    void refetch();
  }, [refetch]);

  let state: FeedState;
  if (!deviceId) {
    state = { kind: "offline", message: "This room has no camera device ID." };
  } else if (access.isError) {
    state = { kind: "error", message: access.error.message };
  } else if (!data) {
    state = { kind: "loading" };
  } else if (!data.online) {
    state = { kind: "offline", message: offlineMessage(data.reason, data.lastHeartbeatAt) };
  } else if (failures > MAX_FEED_FAILURES) {
    state = {
      kind: "error",
      message:
        "Can't load video from the camera laptop. Check that the detection service is running and port 8002 is allowed in its firewall.",
    };
  } else {
    state = { kind: "live", src: data.streamUrl };
  }

  return { state, onImageError, onImageLoad, retry };
}
