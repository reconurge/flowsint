"use client"

import type * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, getAvatarColor } from "@/lib/utils"
import { getInitials } from "@/lib/utils"
import { type Profile } from '@/types/index'
interface AvatarListProps extends React.HTMLAttributes<HTMLDivElement> {
    users: (Profile & { owner: boolean })[]
    /** Maximum number of avatars to display before showing the count */
    maxCount?: number
    /** Size of the avatars in pixels */
    size?: "sm" | "md" | "lg"
    /** Whether to show tooltips with user names */
    showTooltips?: boolean
}

export function AvatarList({
    users,
    maxCount = 3,
    size = "md",
    showTooltips = true,
    className,
    ...props
}: AvatarListProps) {

    const visibleUsers = users.slice(0, maxCount)
    const remainingCount = Math.max(0, users.length - maxCount)

    const sizeClasses = {
        sm: {
            avatar: "h-6 w-6",
            container: "space-x-[-7px]",
            more: "h-6 w-6 text-xs",
        },
        md: {
            avatar: "h-7 w-7",
            container: "space-x-[-11px]",
            more: "h-7 w-7 text-sm",
        },
        lg: {
            avatar: "h-8 w-8",
            container: "space-x-[-10px]",
            more: "h-8 w-8 text-base",
        },
    }
    const renderAvatar = (profile: Profile & { owner: boolean }) => {
        const name = `${profile.first_name ?? "J"} ${profile.last_name ?? "J"}`
        const avatarColor = getAvatarColor(name)
        const avatar = (
            <div className="relative">
                <Avatar
                    key={profile.id}
                    className={cn(
                        sizeClasses[size].avatar,
                        "border-2 border-card bg-card relative",
                        "transition-transform",
                        "ring-0 ring-offset-0",
                    )}
                >
                    <AvatarImage src={profile.avatar_url} alt={`${name}'s avatar`} />
                    <AvatarFallback className={cn("text-xs text-white", avatarColor)}>{getInitials(name)}</AvatarFallback>
                </Avatar>
            </div>
        )
        if (showTooltips) {
            return (
                <TooltipProvider key={profile.id} delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>{avatar}</TooltipTrigger>
                        <TooltipContent side="bottom" align="center" className="shadow">
                            {name} {profile.owner && `(owner)`}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }

        return avatar
    }

    return (
        <div className={cn("flex items-center", sizeClasses[size].container, className)} {...props}>
            {visibleUsers.map(renderAvatar)}
            {remainingCount > 0 && (
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Avatar
                                className={cn(
                                    sizeClasses[size].more,
                                    "border-2 border-background bg-muted",
                                    "flex items-center justify-center font-medium text-muted-foreground",
                                )}
                            >
                                <span>+{remainingCount}</span>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center">
                            {remainingCount} more {remainingCount === 1 ? "user" : "users"}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    )
}

