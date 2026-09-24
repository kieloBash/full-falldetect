// location: frontend/components/detection-node/NodeCard.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DetectionNode } from "@/lib/detection-node/types";
import { hostOf, timeAgo } from "@/lib/detection-node/utils";
import { NodeStatusBadge } from "./NodeStatusBadge";

type Props = {
  node: DetectionNode;
  previewDeviceId: string | null;
  onPreview: (deviceId: string) => void;
  onRemove: (node: DetectionNode) => void;
};

export function NodeCard({ node, previewDeviceId, onPreview, onRemove }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{node.name}</CardTitle>
            <CardDescription>Node key: {node.nodeKey}</CardDescription>
          </div>
          <NodeStatusBadge status={node.online ? "online" : "offline"} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Last heartbeat</dt>
          <dd>{timeAgo(node.lastHeartbeatAt)}</dd>
          <dt className="text-muted-foreground">Video address</dt>
          <dd className="truncate" title={node.streamBaseUrl ?? undefined}>
            {hostOf(node.streamBaseUrl)}
          </dd>
        </dl>

        {node.cameras.length === 0 ? (
          <p className="text-sm text-muted-foreground">This laptop hasn&apos;t reported any known cameras.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camera</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last frame</TableHead>
                  <TableHead className="text-right">Video</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {node.cameras.map((cam) => (
                  <TableRow key={cam.sensorId}>
                    <TableCell className="font-medium">{cam.deviceId}</TableCell>
                    <TableCell>
                      Room {cam.roomLabel}, floor {cam.floorLabel}
                    </TableCell>
                    <TableCell>
                      <NodeStatusBadge status={cam.status} />
                    </TableCell>
                    <TableCell>{timeAgo(cam.lastSeenAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={previewDeviceId === cam.deviceId ? "secondary" : "outline"}
                        onClick={() => onPreview(cam.deviceId)}
                      >
                        {previewDeviceId === cam.deviceId ? "Showing" : "Show video"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-end">
        <Button size="sm" variant="ghost" onClick={() => onRemove(node)}>
          Remove node
        </Button>
      </CardFooter>
    </Card>
  );
}
