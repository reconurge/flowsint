import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { investigationService } from '@/api/investigation-service'
import { authService } from '@/api/auth-service'
import { queryKeys } from '@/api/query-keys'
import { toast } from 'sonner'
import type { Collaborator, InvestigationRole, Profile } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { X, UserPlus, Crown, Shield, Pencil, Eye, Users, Check } from 'lucide-react'
import { getDisplayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'

const ROLE_OPTIONS: {
  value: InvestigationRole
  label: string
  icon: typeof Eye
  className: string
}[] = [
  {
    value: 'admin',
    label: 'Admin',
    icon: Shield,
    className: 'bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400'
  },
  {
    value: 'editor',
    label: 'Editor',
    icon: Pencil,
    className: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400'
  },
  {
    value: 'viewer',
    label: 'Viewer',
    icon: Eye,
    className: 'bg-zinc-500/15 text-zinc-700 border-zinc-500/30 dark:text-zinc-400'
  }
]

const ROLE_BADGE: Record<
  InvestigationRole,
  { label: string; icon: typeof Eye; className: string }
> = {
  owner: {
    label: 'Owner',
    icon: Crown,
    className: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400'
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    className: 'bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400'
  },
  editor: {
    label: 'Editor',
    icon: Pencil,
    className: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400'
  },
  viewer: {
    label: 'Viewer',
    icon: Eye,
    className: 'bg-zinc-500/15 text-zinc-700 border-zinc-500/30 dark:text-zinc-400'
  }
}

function getRoleFromCollaborator(collab: Collaborator): InvestigationRole {
  return (collab.roles[0] ?? 'viewer') as InvestigationRole
}

const RoleBadge = ({
  role,
  className,
  ...props
}: { role: InvestigationRole; className?: string } & React.ComponentProps<'div'>) => {
  const config = ROLE_BADGE[role]
  const Icon = config.icon
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 text-[11px] font-medium shadow-none px-1.5 py-0 cursor-default',
        config.className,
        className
      )}
      {...props}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

interface ShareDialogProps {
  investigationId: string
  children: React.ReactNode
}

export function ShareDialog({ investigationId, children }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedEmail, setSelectedEmail] = useState('')
  const [role, setRole] = useState<string>('editor')
  const [suggestions, setSuggestions] = useState<Profile[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const queryClient = useQueryClient()

  const { data: collaborators = [], isLoading } = useQuery<Collaborator[]>({
    queryKey: queryKeys.investigations.collaborators(investigationId),
    queryFn: () => investigationService.getCollaborators(investigationId),
    enabled: open
  })

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    setSelectedEmail(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await authService.searchUsers(value)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
      } catch {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSelectUser = (user: Profile) => {
    setSelectedEmail(user.email ?? '')
    setQuery(getDisplayName(user))
    setShowSuggestions(false)
    setSuggestions([])
  }

  const addMutation = useMutation({
    mutationFn: (body: { email: string; role: string }) =>
      investigationService.addCollaborator(investigationId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.investigations.collaborators(investigationId)
      })
      setQuery('')
      setSelectedEmail('')
      toast.success('Collaborator added')
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to add collaborator'
      toast.error(message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      investigationService.updateCollaboratorRole(investigationId, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.investigations.collaborators(investigationId)
      })
      toast.success('Role updated')
    },
    onError: () => toast.error('Failed to update role')
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      investigationService.removeCollaborator(investigationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.investigations.collaborators(investigationId)
      })
      toast.success('Collaborator removed')
    },
    onError: () => toast.error('Failed to remove collaborator')
  })

  const handleInvite = () => {
    if (!selectedEmail.trim()) return
    addMutation.mutate({ email: selectedEmail.trim(), role })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4">
          <DialogTitle className="text-base">Share investigation</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Invite collaborators and manage access.
          </DialogDescription>
        </DialogHeader>

        {/* Invite form */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Search by name or email..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInvite()
                    setShowSuggestions(false)
                  }
                  if (e.key === 'Escape') setShowSuggestions(false)
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="h-9"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-lg overflow-hidden">
                  {suggestions.map((user) => (
                    <button
                      key={user.id}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleSelectUser(user)
                      }}
                    >
                      <UserAvatar user={user} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{getDisplayName(user)}</p>
                        {user.email && (
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-[100px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 opacity-60" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-9 px-3"
              onClick={handleInvite}
              disabled={!selectedEmail.trim() || addMutation.isPending}
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Invite
            </Button>
          </div>
        </div>

        <Separator />

        {/* Collaborators list */}
        <div className="max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          ) : collaborators.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <Users className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No collaborators yet</p>
            </div>
          ) : (
            <div className="p-2">
              {collaborators.map((collab) => {
                const collabRole = getRoleFromCollaborator(collab)
                const isOwner = collabRole === 'owner'
                return (
                  <div
                    key={collab.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors group"
                  >
                    <UserAvatar user={collab.user} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getDisplayName(collab.user)}</p>
                      {collab.user?.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {collab.user.email}
                        </p>
                      )}
                    </div>
                    {isOwner ? (
                      <RoleBadge role="owner" />
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button>
                            <RoleBadge role={collabRole} className="cursor-pointer hover:opacity-80 transition-opacity" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px]">
                          {ROLE_OPTIONS.map((opt) => {
                            const Icon = opt.icon
                            const isActive = opt.value === collabRole
                            return (
                              <DropdownMenuItem
                                key={opt.value}
                                onClick={() => updateMutation.mutate({ userId: collab.user_id, role: opt.value })}
                                className="flex items-center gap-2"
                              >
                                <Icon className="w-3.5 h-3.5 opacity-60" />
                                {opt.label}
                                {isActive && <Check className="w-3.5 h-3.5 ml-auto" />}
                              </DropdownMenuItem>
                            )
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7 shrink-0',
                        isOwner
                          ? 'invisible'
                          : 'text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity'
                      )}
                      onClick={() => !isOwner && removeMutation.mutate(collab.user_id)}
                      disabled={isOwner}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {collaborators.length > 0 && (
          <>
            <Separator />
            <div className="px-5 py-3">
              <p className="text-xs text-muted-foreground">
                {collaborators.length} member{collaborators.length !== 1 ? 's' : ''} have access
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
