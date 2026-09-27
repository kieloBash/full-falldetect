// location: frontend/components/ui/profile-dropdown.tsx
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogoutMutation, useProfileMe } from "@/lib/auth/queries";

/** Avatar menu in the top bars: who is signed in, and Log out. */
export function ProfileDropdown() {
  const { data: profile } = useProfileMe();
  const logoutMutation = useLogoutMutation();
  const initials = `${profile?.firstName?.charAt(0) ?? ""}${profile?.lastName?.charAt(0) ?? ""}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
            <Avatar className="h-8 w-8 bg-teal-600 text-xs font-semibold text-white">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent className="w-56">
        {profile && (
          <>
            <div className="px-2 py-1.5">
              <div className="truncate text-sm font-semibold text-slate-900">
                {profile.firstName} {profile.lastName}
              </div>
              <div className="truncate text-xs text-slate-500">{profile.email}</div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => logoutMutation.mutate()} variant="destructive">
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
