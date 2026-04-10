import type React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Star, Share, Trash2, Clock } from "lucide-react"
import { Investigation, Collaborator } from "@/types"
import { formatDistanceToNow } from "date-fns"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { investigationService } from "@/api/investigation-service"
import { useConfirm } from "@/components/use-confirm-dialog"
import { queryKeys } from "@/api/query-keys"
import { toast } from "sonner"
import { Link, useRouter } from "@tanstack/react-router"
import { usePermissions } from "@/hooks/use-can"
import { ShareDialog } from "./share-dialog"
import { getInitials } from "@/lib/user-display"

type CaseOverviewPageProps = {
  investigation: Investigation
}

export function CaseHeader({ investigation }: CaseOverviewPageProps) {
  const lastUpdated = formatDistanceToNow(new Date(investigation.last_updated_at), {
    addSuffix: true
  })
  const router = useRouter()
  const { canDelete, canManage } = usePermissions()

  const { confirm } = useConfirm()
  const queryClient = useQueryClient()

  const { data: collaborators = [] } = useQuery<Collaborator[]>({
    queryKey: queryKeys.investigations.collaborators(investigation.id),
    queryFn: () => investigationService.getCollaborators(investigation.id),
  })

  const handleDeleteInvestigation = async () => {
    const confirmed = await confirm({
      title: 'Delete Investigation',
      message: `Are you sure you want to delete "${investigation.name}"? This will also delete all sketches within it. This action cannot be undone.`
    })

    if (confirmed) {
      const deletePromise = () =>
        investigationService.delete(investigation.id).then(() => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.investigations.list
          })
          queryClient.removeQueries({
            queryKey: queryKeys.investigations.detail(investigation.id)
          })
          queryClient.removeQueries({
            queryKey: queryKeys.investigations.sketches(investigation.id)
          })
          queryClient.removeQueries({
            queryKey: queryKeys.investigations.analyses(investigation.id)
          })
          queryClient.removeQueries({
            queryKey: queryKeys.investigations.flows(investigation.id)
          })
          router.navigate({ to: "/dashboard" })
        })

      toast.promise(deletePromise, {
        loading: 'Deleting investigation...',
        success: () => `Investigation "${investigation.name}" has been deleted`,
        error: 'Failed to delete investigation'
      })
    }
  }

  return (
    <div className="space-y-6 pb-6 border-b border-border">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to={"/dashboard"} className="hover:text-foreground cursor-pointer transition-colors">Cases</Link>
        <span>/</span>
        <span className="text-foreground">{investigation.name}</span>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{investigation.name}</h1>
            <FavoriteButton />
          </div>

          {/* Inline properties */}
          <div className="flex items-center gap-4 text-sm">
            <PropertyPill label="Status" value={investigation.status} valueClass="text-success" />
            <PropertyPill label="Priority" value="Medium" valueClass="text-primary" />
            <PropertyPill label="Updated" value={lastUpdated} icon={<Clock className="w-3 h-3" />} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {canManage && (
            <ShareDialog investigationId={investigation.id}>
              <Button variant="ghost" size="sm" className="text-muted-foreground h-8 px-2">
                <Share className="w-4 h-4" />
              </Button>
            </ShareDialog>
          )}
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground h-8 px-2">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleDeleteInvestigation} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Team */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1.5">
          {collaborators.map((collab) => (
              <Avatar key={collab.id} className="h-5 w-5 border border-background">
                {collab.user?.avatar_url && <AvatarImage src={collab.user.avatar_url} />}
                <AvatarFallback className="text-[10px]">{getInitials(collab.user)}</AvatarFallback>
              </Avatar>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {collaborators.length} investigator{collaborators.length !== 1 ? 's' : ''}
        </span>
        {canManage && (
          <ShareDialog investigationId={investigation.id}>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1">+ Invite</button>
          </ShareDialog>
        )}
      </div>
    </div>
  )
}

function PropertyPill({
  label,
  value,
  valueClass = "text-foreground",
  icon,
}: {
  label: string
  value: string
  valueClass?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground/60 font-normal">{label}</span>
      <span className={`flex items-center gap-1 font-medium ${valueClass}`}>
        {icon}
        {value}
      </span>
    </div>
  )
}

// function Tag({ children }: { children: React.ReactNode }) {
//   return <span className="px-2 py-0.5 rounded bg-secondary text-xs text-secondary-foreground">{children}</span>
// }


const FavoriteButton = () => {
  const [fav, setFav] = useState<boolean>(false)
  return (
    <button onClick={() => setFav(!fav)} className={cn("text-muted-foreground hover:text-warning transition-colors")}>
      <Star className={cn("w-4 h-4", fav && "text-warning fill-warning")} />
    </button>
  )
}