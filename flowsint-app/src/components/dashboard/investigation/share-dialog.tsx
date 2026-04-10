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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, UserPlus, Crown, Shield, Pencil, Eye } from 'lucide-react'
import { getDisplayName, getInitials } from '@/lib/user-display'

const ROLE_OPTIONS: { value: InvestigationRole; label: string; icon: typeof Eye }[] = [
  { value: 'admin', label: 'Admin', icon: Shield },
  { value: 'editor', label: 'Editor', icon: Pencil },
  { value: 'viewer', label: 'Viewer', icon: Eye },
]

function getRoleFromCollaborator(collab: Collaborator): InvestigationRole {
  return (collab.roles[0] ?? 'viewer') as InvestigationRole
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
    enabled: open,
  })

  // Debounced user search
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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
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
        queryKey: queryKeys.investigations.collaborators(investigationId),
      })
      setQuery('')
      setSelectedEmail('')
      toast.success('Collaborator added')
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to add collaborator'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      investigationService.updateCollaboratorRole(investigationId, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.investigations.collaborators(investigationId),
      })
      toast.success('Role updated')
    },
    onError: () => toast.error('Failed to update role'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      investigationService.removeCollaborator(investigationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.investigations.collaborators(investigationId),
      })
      toast.success('Collaborator removed')
    },
    onError: () => toast.error('Failed to remove collaborator'),
  })

  const handleInvite = () => {
    if (!selectedEmail.trim()) return
    addMutation.mutate({ email: selectedEmail.trim(), role })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share investigation</DialogTitle>
        </DialogHeader>

        {/* Invite form */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Search by email..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { handleInvite(); setShowSuggestions(false) }
                if (e.key === 'Escape') setShowSuggestions(false)
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden">
                {suggestions.map((user) => (
                  <button
                    key={user.id}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left transition-colors"
                    onMouseDown={(e) => { e.preventDefault(); handleSelectUser(user) }}
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                      <AvatarFallback className="text-[10px]">{getInitials(user)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{getDisplayName(user)}</p>
                      {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleInvite}
            disabled={!selectedEmail.trim() || addMutation.isPending}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>

        {/* Collaborators list */}
        <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : collaborators.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">No collaborators yet</div>
          ) : (
            collaborators.map((collab) => {
              const isOwner = getRoleFromCollaborator(collab) === 'owner'
              return (
                <div
                  key={collab.id}
                  className="flex items-center gap-3 py-2 px-1 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-7 w-7">
                    {collab.user?.avatar_url && <AvatarImage src={collab.user.avatar_url} />}
                    <AvatarFallback className="text-xs">
                      {getInitials(collab.user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getDisplayName(collab.user)}
                    </p>
                  </div>
                  {isOwner ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                      <Crown className="w-3 h-3" />
                      Owner
                    </div>
                  ) : (
                    <>
                      <Select
                        value={getRoleFromCollaborator(collab)}
                        onValueChange={(newRole) =>
                          updateMutation.mutate({ userId: collab.user_id, role: newRole })
                        }
                      >
                        <SelectTrigger className="w-24 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMutation.mutate(collab.user_id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
