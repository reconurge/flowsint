import { Command } from '../command'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import InvestigationSelector from './investigation-selector'
import SketchSelector from './sketch-selector'
import { memo, useCallback } from 'react'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { useLayoutStore } from '@/stores/layout-store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Ellipsis } from 'lucide-react'
import { isMac } from '@/lib/utils'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useConfirm } from '../use-confirm-dialog'
import { sketchService } from '@/api/sketch-service'
import { toast } from 'sonner'

export const TopNavbar = memo(() => {
  const { investigationId, id, type } = useParams({ strict: false })
  const toggleAnalysis = useLayoutStore((s) => s.toggleAnalysis)
  const isOpenAnalysis = useLayoutStore((s) => s.isOpenAnalysis)

  const handleToggleAnalysis = useCallback(() => toggleAnalysis(), [toggleAnalysis])

  return (
    <header
      className="flex items-center bg-card h-12 border-b shrink-0 px-4"
      data-tour-id="navigation"
    >
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src="/icon.png" alt="Flowsint" className="h-8 w-8" />
          <span className="text-lg font-semibold">Flowsint</span>
        </Link>
        <div className="hidden lg:flex items-center gap-2">
          {investigationId && <InvestigationSelector />}
          {id && (
            <>
              <span className="opacity-30 text-sm">/</span>
              <SketchSelector />
            </>
          )}
        </div>
      </div>
      <div className="grow flex items-center justify-center">
        <div>
          <Command />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          {type === 'graph' && (
            <>
              <Switch checked={isOpenAnalysis} onCheckedChange={handleToggleAnalysis} id="notes" />
              <Label htmlFor="notes">
                Toggle notes
                <span className="text-[.7rem] -ml-1 opacity-60">({isMac ? '⌘' : 'ctrl'}L)</span>
              </Label>
            </>
          )}
        </div>
        {id && <InvestigationMenu investigationId={investigationId} sketchId={id} />}
        {/* <NavUser /> */}
      </div>
    </header>
  )
})

export function InvestigationMenu({ investigationId, sketchId }: { investigationId?: string, sketchId: string }) {
  const setSettingsModalOpen = useGraphSettingsStore((s) => s.setSettingsModalOpen)
  const setKeyboardShortcutsOpen = useGraphSettingsStore((s) => s.setKeyboardShortcutsOpen)
  const navigate = useNavigate()
  const { confirm } = useConfirm()

  // Delete sketch mutation
  const deleteSketchMutation = useMutation({
    mutationFn: sketchService.delete,
    onSuccess: () => {
      investigationId &&
        navigate({
          to: '/dashboard/investigations/$investigationId',
          params: {
            investigationId: investigationId as string
          }
        })
    },
    onError: (error) => {
      console.error('Error deleting sketch:', error)
    }
  })

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const confirmed = await confirm({
      title: 'Delete Sketch',
      message: `Are you sure you want to delete this sketch ? This action cannot be undone.`
    })

    if (confirmed) {
      toast.promise(deleteSketchMutation.mutateAsync(sketchId), {
        loading: 'Deleting sketch...',
        success: () => `Sketch has been deleted`,
        error: 'Failed to delete sketch'
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <Button size="icon" variant="ghost">
            <Ellipsis />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setSettingsModalOpen(true)}>
            General
            <DropdownMenuShortcut>⌘G</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setKeyboardShortcutsOpen(true)}>
            Keyboard shortcuts
            <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <a className='h-full w-full' target='_blank' href="https://github.com/reconurge/flowsint">GitHub</a>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <a className='h-full w-full' target='_blank' href="https://github.com/reconurge/flowsint/issues">Support</a>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>API</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} variant="destructive">
          Delete
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
