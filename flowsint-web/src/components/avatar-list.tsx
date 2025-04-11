"use client"

import type * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, getAvatarColor } from "@/lib/utils"

export interface User {
    id: string
    name: string
    email?: string
    image?: string
}

interface AvatarListProps extends React.HTMLAttributes<HTMLDivElement> {
    users: User[]
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
            avatar: "h-8 w-8",
            container: "space-x-[-11px]",
            more: "h-8 w-8 text-sm",
        },
        lg: {
            avatar: "h-10 w-10",
            container: "space-x-[-15px]",
            more: "h-10 w-10 text-base",
        },
    }

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .substring(0, 2)
    }

    const renderAvatar = (user: User) => {
        const avatarColor = getAvatarColor(user.name)
        const avatar = (
            <Avatar
                key={user.id}
                className={cn(
                    sizeClasses[size].avatar,
                    "border-2 border-background bg-background",
                    "transition-transform",
                    "ring-0 ring-offset-0",
                )}
            >
                <AvatarImage src={user.image} alt={`${user.name}'s avatar`} />
                <AvatarFallback className={cn("text-xs text-white", avatarColor)}>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
        )

        if (showTooltips) {
            return (
                <TooltipProvider key={user.id} delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>{avatar}</TooltipTrigger>
                        <TooltipContent side="bottom" align="center" className="shadow">
                            {user.name}
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

