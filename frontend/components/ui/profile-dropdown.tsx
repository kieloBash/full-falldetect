"use client"

import {
    Avatar,
    AvatarFallback
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useLogoutMutation, useProfileMe } from "@/lib/auth/queries";

export function ProfileDropdown() {
    const { data: profile } = useProfileMe();
    const logoutMutate = useLogoutMutation()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8 bg-teal-600 text-xs font-semibold text-white">
                    {/* <AvatarImage src="" alt="shadcn" /> */}
                    <AvatarFallback>{profile?.firstName.charAt(0)}{profile?.lastName.charAt(0)}</AvatarFallback>
                </Avatar>
            </Button>} />
            < DropdownMenuContent className="w-32" >
                {/* <DropdownMenuGroup>
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator /> */}
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => {
                        logoutMutate.mutate()
                    }} variant="destructive">Log out</DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent >
        </DropdownMenu >
    )
}
