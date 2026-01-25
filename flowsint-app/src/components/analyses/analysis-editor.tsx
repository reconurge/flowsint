import { useState, useEffect, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MinimalTiptapEditor } from '@/components/analyses/editor'
import { analysisService } from '@/api/analysis-service'
import type { Analysis } from '@/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PlusIcon,
  Trash2,
  ChevronDown,
  ChevronsRight,
  ExternalLink,
  MoreVertical
} from 'lucide-react'
import { toast } from 'sonner'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { useConfirm } from '../use-confirm-dialog'
import { Editor } from '@tiptap/core'
import { Link, useParams } from '@tanstack/react-router'
import { useLayoutStore } from '@/stores/layout-store'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { queryKeys } from '@/api/query-keys'
import { useCreateAnalysis } from '@/hooks/use-create-analysis'
import { SaveStatusBadge } from '@/components/shared/save-status-badge'

interface AnalysisEditorProps {
  // Core data
  analysis: Analysis | null
  investigationId: string
  ownerId?: string

  // Callbacks
  onAnalysisUpdate?: (analysis: Analysis) => void
  onAnalysisDelete?: (analysisId: string) => void
  onAnalysisCreate?: (investigationId: string) => void
  onAnalysisSelect?: (analysisId: string) => void

  // UI customization
  showHeader?: boolean
  showActions?: boolean
  showToolbar?: boolean
  showAnalysisSelector?: boolean
  showNavigation?: boolean
  className?: string

  // Loading states
  isLoading?: boolean
  isRefetching?: boolean

  // Analysis list for selector
  analyses?: Analysis[]
  currentAnalysisId?: string | null
}

export const AnalysisEditor = ({
  analysis,
  investigationId,
  onAnalysisUpdate,
  onAnalysisDelete,
  onAnalysisCreate,
  onAnalysisSelect,
  showHeader = true,
  showActions = true,
  showAnalysisSelector = false,
  showNavigation = false,
  className = '',
  isLoading = false,
  analyses = [],
  currentAnalysisId,
  showToolbar = false
}: AnalysisEditorProps) => {
  const { confirm } = useConfirm()
  const toggleAnalysis = useLayoutStore((s) => s.toggleAnalysis)
  const { investigationId: routeInvestigationId, type } = useParams({ strict: false }) as {
    investigationId: string
    type: string
  }
  const queryClient = useQueryClient()
  // State/refs for editor
  const editorContentRef = useRef<any>('')
  const [titleValue, setTitleValue] = useState('')
  const [editor, setEditor] = useState<Editor | undefined>(undefined)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  // Debounced save function

  const createMutation = useCreateAnalysis(routeInvestigationId, onAnalysisCreate)

  const debouncedSave = useCallback(
    debounce(() => {
      if (analysis) {
        setSaveStatus('saving')
        saveMutation.mutate({})
      }
    }, 1000), // 1 second delay
    [analysis?.id]
  )

  // Handle editor content changes
  const handleEditorChange = useCallback(
    (value: any) => {
      editorContentRef.current = value
      if (analysis) {
        setSaveStatus('unsaved')
        debouncedSave()
      }
    },
    [analysis?.id, debouncedSave]
  )

  // Debounce function
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (updated: Partial<Analysis>) => {
      if (!analysis) return
      return analysisService.update(
        analysis.id,
        JSON.stringify({
          ...analysis,
          ...updated,
          content: editorContentRef.current
        })
      )
    },
    onSuccess: async (data) => {
      // Use more specific query invalidation with query key factory
      queryClient.setQueryData(
        queryKeys.analyses.byInvestigation(investigationId || ''),
        (oldData: Analysis[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map((item) => (item.id === data.id ? data : item))
        }
      )
      onAnalysisUpdate?.(data)
      setSaveStatus('saved')
    },
    onError: (error) => {
      toast.error(
        'Failed to save analysis: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
      setSaveStatus('unsaved')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return analysisService.delete(id)
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.analyses.byInvestigation(investigationId || '')
      })
      onAnalysisDelete?.(investigationId)
      toast.success('Analysis deleted')
    },
    onError: (error) => {
      toast.error(
        'Failed to delete analysis: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!analysis) return
      return analysisService.update(
        analysis.id,
        JSON.stringify({
          ...analysis,
          title: newTitle
        })
      )
    },
    onSuccess: async (data) => {
      // Use more specific query invalidation
      queryClient.setQueryData(['analyses', investigationId], (oldData: Analysis[] | undefined) => {
        if (!oldData) return oldData
        return oldData.map((item) => (item.id === data.id ? data : item))
      })
      onAnalysisUpdate?.(data)
      toast.success('Title updated')
    },
    onError: (error) => {
      toast.error(
        'Failed to update title: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  // Handle title update
  const handleTitleUpdate = (newTitle: string) => {
    if (!analysis || newTitle === analysis.title) return
    setTitleValue(newTitle)
    updateTitleMutation.mutate(newTitle)
    setIsEditingTitle(false)
  }

  const deleteAnalysis = async () => {
    if (!analysis?.id) {
      toast.error('No analysis selected')
      return
    }
    if (
      !(await confirm({
        title: 'Delete analysis',
        message: 'Are you sure you want to delete this analysis?'
      }))
    ) {
      return
    }
    deleteMutation.mutate(analysis.id)
  }

  const handleManualSave = () => {
    if (analysis) {
      setSaveStatus('saving')
      saveMutation.mutate({})
    }
  }

  // Update non-editor UI when analysis changes (avoid resetting content on same doc)
  useEffect(() => {
    if (analysis) {
      setTitleValue(analysis.title || '')
      setSaveStatus('saved')
    } else {
      setTitleValue('')
      setSaveStatus('saved')
      if (editor) {
        editor.commands.setContent('')
      }
    }
  }, [analysis?.id, analysis?.title, editor])

  useKeyboardShortcut({
    key: 's',
    ctrlOrCmd: true,
    callback: () => {
      handleManualSave()
    }
  })

  if (isLoading) {
    return <Skeleton className="h-full w-full" />
  }

  return (
    <div className={`flex flex-col h-full w-full overflow-y-auto bg-card ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="bg-card/70 sticky top-0 z-10 backdrop-blur-sm h-10 border-b w-full flex items-center justify-between">
          <div className="flex items-center justify-between p-3 w-full">
            {/* Left section with navigation and title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {showNavigation && type !== 'analysis' && (
                <Button className="h-8 w-8" variant="ghost" onClick={toggleAnalysis}>
                  <ChevronsRight className="opacity-70" />
                </Button>
              )}

              {/* Analysis Selector */}
              {showAnalysisSelector && analyses && analyses.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown className="h-4 w-4 opacity-70" />
                      </Button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[200px] max-h-[300px] overflow-y-auto truncate text-ellipsis p-0"
                    align="start"
                  >
                    <div className="flex flex-col truncate text-ellipsis">
                      {analyses.map((analysisItem) => (
                        <Button
                          key={analysisItem.id}
                          variant="ghost"
                          className="justify-start px-2 py-1.5 h-auto truncate text-ellipsis"
                          onClick={() => onAnalysisSelect?.(analysisItem.id)}
                        >
                          <div className="flex flex-col items-start truncate text-ellipsis">
                            <span className="font-medium truncate text-ellipsis">
                              {analysisItem.title || 'Untitled'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {analysisItem.id === currentAnalysisId
                                ? 'Current'
                                : 'Switch to this analysis'}
                            </span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Title section */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isEditingTitle ? (
                  <input
                    className="text-md font-medium bg-transparent outline-none border-none p-0 m-0 w-full"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={() => {
                      handleTitleUpdate(titleValue)
                      setIsEditingTitle(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleTitleUpdate(titleValue)
                        setIsEditingTitle(false)
                      } else if (e.key === 'Escape') {
                        setIsEditingTitle(false)
                        setTitleValue(analysis?.title || '')
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    className={`text-md font-medium truncate min-w-0 flex-1 ${'cursor-pointer hover:text-primary'}`}
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {titleValue || 'Untitled Analysis'}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {showActions && (
              <div className="flex items-center gap-1">
                <SaveStatusBadge status={saveStatus} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4 opacity-70" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {analysis && type !== 'analysis' && (
                      <DropdownMenuItem asChild>
                        <Link
                          to="/dashboard/investigations/$investigationId/$type/$id"
                          params={{
                            investigationId: routeInvestigationId || investigationId,
                            type: 'analysis',
                            id: analysis.id
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" strokeWidth={1.5} />
                          Open in full page
                        </Link>
                      </DropdownMenuItem>
                    )}

                    {type !== 'analysis' && (
                      <DropdownMenuItem
                        onClick={() => createMutation.mutate()}
                        disabled={createMutation.isPending}
                      >
                        <PlusIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        New analysis
                      </DropdownMenuItem>
                    )}
                    {analysis && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={deleteAnalysis}
                          disabled={deleteMutation.isPending}
                          variant="destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                          Delete analysis
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0 flex flex-col">
        {analysis ? (
          <div className="h-full w-full">
            <MinimalTiptapEditor
              key={analysis.id}
              immediatelyRender={true}
              value={(function getInitialContent() {
                const content = analysis.content as any
                if (typeof content === 'string') {
                  try {
                    return JSON.parse(content)
                  } catch {
                    return content || ''
                  }
                }
                return content || ''
              })()}
              onChange={handleEditorChange}
              className="w-full h-full"
              editorContentClassName="p-5 min-h-[300px]"
              output="json"
              placeholder={'Enter your analysis...'}
              autofocus={true}
              showToolbar={showToolbar}
              editorClassName="focus:outline-hidden"
              onEditorReady={setEditor}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
            <div>No analysis selected.</div>
            <Button
              className="shadow-none"
              variant="outline"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              <PlusIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Create your first analysis
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
