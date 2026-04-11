import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'
import { getDisplayName, getInitials } from '@/lib/user-display'
import type { Profile } from '@/types'
import type { User } from '@/stores/auth-store'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type UserLike = (Partial<Profile> & Partial<User>) | null | undefined

const SIZES = {
  xs: { root: 'size-5', text: 'text-[10px]' },
  sm: { root: 'size-6', text: 'text-[10px]' },
  md: { root: 'size-7', text: 'text-xs' },
  lg: { root: 'size-8', text: 'text-sm' },
  xl: { root: 'size-10', text: 'text-base' },
} as const

type AvatarSize = keyof typeof SIZES

// --- Primitives (re-exported for non-user edge cases like tool-card) ---

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square object-cover size-full', className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn('bg-muted flex size-full items-center justify-center rounded-full', className)}
      {...props}
    />
  )
}

// --- Domain components ---

interface UserAvatarProps {
  user: UserLike
  size?: AvatarSize
  className?: string
}

function UserAvatar({ user, size = 'lg', className }: UserAvatarProps) {
  const s = SIZES[size]
  return (
    <Avatar className={cn(s.root, className)}>
      {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={getDisplayName(user)} />}
      <AvatarFallback className={s.text}>{getInitials(user)}</AvatarFallback>
    </Avatar>
  )
}

interface AvatarGroupProps {
  users: UserLike[]
  size?: AvatarSize
  max?: number
  className?: string
}

function AvatarGroup({ users, size = 'sm', max, className }: AvatarGroupProps) {
  const visible = max != null ? users.slice(0, max) : users
  const overflow = max != null ? users.length - max : 0
  const s = SIZES[size]

  return (
    <div className={cn('flex -space-x-1.5', className)}>
      {visible.map((user, i) => (
        <Tooltip key={user?.id ?? i}>
          <TooltipTrigger asChild>
            <div>
              <UserAvatar
                user={user}
                size={size}
                className="border border-background"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>{getDisplayName(user)}</TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            s.root,
            s.text,
            'relative flex shrink-0 items-center justify-center rounded-full border border-background bg-muted font-medium text-muted-foreground'
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}

export { Avatar, AvatarImage, AvatarFallback, UserAvatar, AvatarGroup }
