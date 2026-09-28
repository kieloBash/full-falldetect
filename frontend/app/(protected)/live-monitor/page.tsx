import { LiveMonitor } from "@/components/live-monitor/LiveMonitor";
import { QueryProvider } from "@/components/providers/QueryProvider";

export const metadata = {
  title: "Live Monitor · WatchCare",
};

export default function LiveMonitorPage() {
  return (
    <QueryProvider>
      <LiveMonitor />
    </QueryProvider>
  );
}
