// location: frontend/app/(protected)/admin/detection-nodes/page.tsx
// The admin layout already provides the QueryClient (TDS §8.1).
import { DetectionNodesScreen } from "@/components/detection-node/DetectionNodesScreen";

export const metadata = { title: "Camera laptops | FallDetect" };

export default function DetectionNodesPage() {
  return <DetectionNodesScreen />;
}
