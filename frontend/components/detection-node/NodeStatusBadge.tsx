// location: frontend/components/detection-node/NodeStatusBadge.tsx
import { Badge } from "@/components/ui/badge";
import type { SensorStatus } from "@/lib/detection-node/types";

const LOOK: Record<SensorStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  online: { label: "Online", variant: "default" },
  degraded: { label: "Degraded", variant: "secondary" },
  offline: { label: "Offline", variant: "destructive" },
};

export function NodeStatusBadge({ status }: { status: SensorStatus }) {
  const look = LOOK[status];
  return <Badge variant={look.variant}>{look.label}</Badge>;
}
