// location: frontend/app/(protected)/admin/users/page.tsx
// The admin layout provides the QueryClient; proxy.ts limits /admin/* to ADMIN.
import { UserManagementScreen } from "@/components/users/UserManagementScreen";

export const metadata = {
  title: "User Management · WatchCare Admin",
};

export default function AdminUsersPage() {
  return <UserManagementScreen />;
}
