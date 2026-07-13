import { LiveMonitor } from "@/components/live-monitor/LiveMonitor";
import { QueryProvider } from "@/components/providers/QueryProvider";

export const metadata = {
  title: "Live Monitor · FallDetect",
};

export default function LiveMonitorPage() {
  return (
    <QueryProvider>
      <LiveMonitor />
    </QueryProvider>
  );
}
