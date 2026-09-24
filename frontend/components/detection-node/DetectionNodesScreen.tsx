// location: frontend/components/detection-node/DetectionNodesScreen.tsx
// Basic admin screen for viewing and testing camera laptops (detection nodes).
"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDetectionNodes } from "@/lib/detection-node/useDetectionNodes";
import { DeleteNodeDialog } from "./DeleteNodeDialog";
import { NodeCard } from "./NodeCard";
import { RemoteCameraFeed } from "./RemoteCameraFeed";

export function DetectionNodesScreen() {
  const screen = useDetectionNodes();

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Camera laptops</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Laptops running the detection service on this Wi-Fi send fall alerts and live video
          here. A laptop counts as offline after 90 seconds without checking in.
        </p>
        {!screen.isLoading && screen.nodes.length > 0 && (
          <p className="text-sm">
            {screen.summary.nodesOnline} of {screen.summary.nodesTotal} laptops online,{" "}
            {screen.summary.camerasOnline} of {screen.summary.camerasTotal} cameras online.
          </p>
        )}
      </header>

      {screen.error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load camera laptops</AlertTitle>
          <AlertDescription>
            {screen.error.message}{" "}
            <Button size="sm" variant="outline" className="ml-2" onClick={() => screen.refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {screen.previewDeviceId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Camera {screen.previewDeviceId}</CardTitle>
              <Button size="sm" variant="outline" onClick={screen.closePreview}>
                Close video
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <RemoteCameraFeed deviceId={screen.previewDeviceId} className="max-h-[70vh]" />
          </CardContent>
        </Card>
      )}

      {screen.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : screen.nodes.length === 0 && !screen.error ? (
        <Alert>
          <AlertTitle>No camera laptop has connected yet</AlertTitle>
          <AlertDescription>
            Start the detection service on the camera laptop. It appears here within 30 seconds of
            starting, as long as its cameras match a Sensor ID in Admin → Rooms.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {screen.nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              previewDeviceId={screen.previewDeviceId}
              onPreview={screen.openPreview}
              onRemove={screen.requestDelete}
            />
          ))}
        </div>
      )}

      <DeleteNodeDialog
        node={screen.pendingDelete}
        isDeleting={screen.isDeleting}
        error={screen.deleteError}
        onCancel={screen.cancelDelete}
        onConfirm={screen.confirmDelete}
      />
    </main>
  );
}
