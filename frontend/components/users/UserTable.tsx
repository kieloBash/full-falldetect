// location: frontend/components/users/UserTable.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COPY, ROLE_LABEL } from "@/lib/users/constants";
import type { StaffUser } from "@/lib/users/types";
import { formatLastLogin } from "@/lib/users/utils";

export interface UserTableProps {
  users: StaffUser[];
  currentUserId: string | null;
  busy: boolean;
  onEdit: (user: StaffUser) => void;
  onResetPassword: (user: StaffUser) => void;
  onDeactivate: (user: StaffUser) => void;
  onReactivate: (user: StaffUser) => void;
}

/** Accounts table: name, email, account type, status, last sign-in, and row actions. */
export function UserTable({ users, currentUserId, busy, onEdit, onResetPassword, onDeactivate, onReactivate }: UserTableProps) {
  if (users.length === 0) {
    return <div className="py-10 text-center text-[13.5px] text-slate-500">{COPY.noUsers}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-[12px] border border-slate-200 bg-white">
      <Table data-testid="users-table">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Account type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last sign-in</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <TableRow key={user.id} data-testid={`user-row-${user.email}`} className={user.isActive ? "" : "opacity-60"}>
                <TableCell className="font-medium">
                  {user.name}
                  {isSelf && <span className="ml-2 text-xs font-normal text-slate-500">({COPY.you})</span>}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{ROLE_LABEL[user.role]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "outline" : "destructive"}>{user.isActive ? "Active" : "Deactivated"}</Badge>
                </TableCell>
                <TableCell className="text-slate-600">{formatLastLogin(user.lastLoginAt)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onResetPassword(user)}>
                      Reset password
                    </Button>
                    {!isSelf &&
                      (user.isActive ? (
                        <Button variant="destructive" size="sm" onClick={() => onDeactivate(user)} disabled={busy}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => onReactivate(user)} disabled={busy}>
                          Reactivate
                        </Button>
                      ))}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
