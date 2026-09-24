// location: frontend/components/detection-node/RemoteCameraFeed.tsx
// Live video from the camera laptop over the LAN. Reusable in the Live Monitor:
// replace the old http://localhost:8002 <img> in CameraFeed with this component.
"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRemoteCameraFeed } from "@/lib/detection-node/useRemoteCameraFeed";
import { cn } from "@/lib/utils";

type Props = {
  deviceId: string | null;
  className?: string;
  alt?: string;
};

export function RemoteCameraFeed(props: Props) {
  // key resets the feed's internal state whenever the camera changes
  return <FeedInner key={props.deviceId ?? "none"} {...props} />;
}

function FeedInner({ deviceId, className, alt }: Props) {
  const { state, onImageError, onImageLoad, retry } = useRemoteCameraFeed(deviceId);

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-md bg-muted", className)}>
      {state.kind === "loading" && <Skeleton className="absolute inset-0" />}

      {state.kind === "live" && (
        // next/image can't render an MJPEG stream, so a plain <img> is intended.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={state.src}
          alt={alt ?? `Live view from camera ${deviceId}`}
          className="h-full w-full object-contain"
          onError={onImageError}
          onLoad={onImageLoad}
        />
      )}

      {(state.kind === "offline" || state.kind === "error") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">{state.message}</p>
          <Button size="sm" variant="outline" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {state.kind === "live" && (
        <span className="absolute left-2 top-2 rounded bg-background/80 px-1.5 py-0.5 text-xs font-medium">
          {deviceId}, live
        </span>
      )}
    </div>
  );
}
