import { AdminScreen } from "@/components/admin/AdminScreen";
import { QueryProvider } from "@/components/providers/QueryProvider";

export const metadata = {
  title: "Floor Management · FallDetect Admin",
};

export default function AdminPage() {
  return (
    <QueryProvider>
      <AdminScreen />
    </QueryProvider>
  );
}
