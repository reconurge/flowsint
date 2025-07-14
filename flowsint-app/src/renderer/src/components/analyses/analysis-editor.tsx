import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MinimalTiptapEditor } from "@/components/analyses/editor"
import { analysisService } from "@/api/analysis-service"
import type { Analysis } from "@/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusIcon, Trash2, Save, ChevronDown, ChevronsRight, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut"
import { useConfirm } from "../use-confirm-dialog"
import { Editor } from "@tiptap/core"
import { Link, useParams } from "@tanstack/react-router"
import { useLayoutStore } from "@/stores/layout-store"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface AnalysisEditorProps {
    // Core data
    analysis: Analysis | null
    investigationId: string

    // Callbacks
    onAnalysisUpdate?: (analysis: Analysis) => void
    onAnalysisDelete?: (analysisId: string) => void
    onAnalysisCreate?: (investigationId: string) => void
    onAnalysisSelect?: (analysisId: string) => void

    // UI customization
    showHeader?: boolean
    showActions?: boolean
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
    className = "",
    isLoading = false,
    analyses = [],
    currentAnalysisId
}: AnalysisEditorProps) => {
    const { confirm } = useConfirm()
    const toggleAnalysis = useLayoutStore(s => s.toggleAnalysis)
    const { investigationId: routeInvestigationId, type } = useParams({ strict: false }) as { investigationId: string, type: string }
    const queryClient = useQueryClient()

    // State for editor
    const [editorValue, setEditorValue] = useState<any>("")
    const [titleValue, setTitleValue] = useState("")
    const [editor, setEditor] = useState<Editor | undefined>(undefined)
    const [isEditingTitle, setIsEditingTitle] = useState(false)

    // Mutations
    const createMutation = useMutation({
        mutationFn: async () => {
            const newAnalysis: Partial<Analysis> = {
                title: "Untitled Analysis",
                investigation_id: investigationId,
                content: {},
            }
            const res = await analysisService.create(JSON.stringify(newAnalysis))
            return res
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ["analyses", investigationId] })
            onAnalysisCreate?.(investigationId)
            toast.success("New analysis created")
        },
        onError: (error) => {
            toast.error("Failed to create analysis: " + (error instanceof Error ? error.message : "Unknown error"))
        }
    })

    const saveMutation = useMutation({
        mutationFn: async (updated: Partial<Analysis>) => {
            if (!analysis) return
            return analysisService.update(analysis.id, JSON.stringify({
                ...analysis,
                ...updated,
                content: editorValue
            }))
        },
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ["analyses", investigationId] })
            onAnalysisUpdate?.(data)
            toast.success("Analysis saved !")
        },
        onError: (error) => {
            toast.error("Failed to save analysis: " + (error instanceof Error ? error.message : "Unknown error"))
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return analysisService.delete(id)
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ["analyses", investigationId] })
            onAnalysisDelete?.(analysis?.id || "")
            toast.success("Analysis deleted")
        },
        onError: (error) => {
            toast.error("Failed to delete analysis: " + (error instanceof Error ? error.message : "Unknown error"))
        }
    })

    const updateTitleMutation = useMutation({
        mutationFn: async (newTitle: string) => {
            if (!analysis) return
            return analysisService.update(analysis.id, JSON.stringify({
                ...analysis,
                title: newTitle
            }))
        },
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ["analyses", investigationId] })
            onAnalysisUpdate?.(data)
            toast.success("Title updated")
        },
        onError: (error) => {
            toast.error("Failed to update title: " + (error instanceof Error ? error.message : "Unknown error"))
        }
    })

    // Handle title update
    const handleTitleUpdate = (newTitle: string) => {
        setTitleValue(newTitle)
        updateTitleMutation.mutate(newTitle)
        setIsEditingTitle(false)
    }

    const deleteAnalysis = async () => {
        if (!analysis?.id) {
            toast.error("No analysis selected")
            return
        }
        if (!await confirm({ title: "Delete Analysis", message: "Are you sure you want to delete this analysis?" })) {
            return
        }
        deleteMutation.mutate(analysis.id)
    }

    // Update editor content when analysis changes
    useEffect(() => {
        if (analysis) {
            // Handle both string content and object content
            const content = analysis.content
            if (typeof content === 'string') {
                try {
                    // Try to parse if it's a JSON string
                    const parsedContent = JSON.parse(content)
                    setEditorValue(parsedContent)
                    if (editor) {
                        editor.commands.setContent(parsedContent)
                    }
                } catch {
                    // If parsing fails, treat as plain text and convert to editor format
                    setEditorValue(content || "")
                    if (editor) {
                        editor.commands.setContent(content || "")
                    }
                }
            } else {
                // If it's already an object, use it directly
                setEditorValue(content || "")
                if (editor) {
                    editor.commands.setContent(content || "")
                }
            }
            setTitleValue(analysis.title || "")
        } else {
            // Reset when no analysis is selected
            setEditorValue("")
            setTitleValue("")
            if (editor) {
                editor.commands.setContent("")
            }
        }
    }, [analysis?.id, analysis?.content, analysis?.title, editor])

    useKeyboardShortcut({
        key: "s",
        ctrlOrCmd: true,
        callback: () => {
            saveMutation.mutate({})
        },
    })

    if (isLoading) {
        return <Skeleton className="h-full w-full" />
    }

    return (
        <div className={`flex flex-col h-full w-full ${className}`}>
            {/* Header */}
            {showHeader && (
                <div className="border-b bg-card h-11 w-full flex items-center justify-between">
                    <div className="flex items-center justify-between p-3 w-full">
                        {/* Left section with navigation and title */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {showNavigation && type !== "analysis" && (
                                <Button className="h-8 w-8" variant="ghost" onClick={toggleAnalysis}>
                                    <ChevronsRight />
                                </Button>
                            )}

                            {/* Analysis Selector */}
                            {showAnalysisSelector && analyses && analyses.length > 0 && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] truncate text-ellipsis p-0" align="start">
                                        <div className="flex flex-col truncate text-ellipsis">
                                            {analyses.map((analysisItem) => (
                                                <Button
                                                    key={analysisItem.id}
                                                    variant="ghost"
                                                    className="justify-start px-2 py-1.5 h-auto truncate text-ellipsis"
                                                    onClick={() => onAnalysisSelect?.(analysisItem.id)}
                                                >
                                                    <div className="flex flex-col items-start truncate text-ellipsis">
                                                        <span className="font-medium truncate text-ellipsis">{analysisItem.title || "Untitled"}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {analysisItem.id === currentAnalysisId ? "Current" : "Switch to this analysis"}
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
                                        onChange={e => setTitleValue(e.target.value)}
                                        onBlur={() => {
                                            handleTitleUpdate(titleValue)
                                            setIsEditingTitle(false)
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                handleTitleUpdate(titleValue)
                                                setIsEditingTitle(false)
                                            } else if (e.key === 'Escape') {
                                                setIsEditingTitle(false)
                                                setTitleValue(analysis?.title || "")
                                            }
                                        }}
                                        autoFocus
                                    />
                                ) : (
                                    <span
                                        className="text-md font-medium cursor-pointer hover:text-primary truncate min-w-0 flex-1"
                                        onClick={() => setIsEditingTitle(true)}
                                    >
                                        {titleValue || "Untitled Analysis"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Action buttons */}
                        {showActions && (
                            <div className="flex items-center gap-1">
                                {analysis && type !== "analysis" && (
                                    <Link to="/dashboard/investigations/$investigationId/$type/$id" params={{
                                        investigationId: routeInvestigationId || investigationId,
                                        type: "analysis",
                                        id: analysis.id
                                    }}>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            title="Open in Full Page"
                                            className="h-8 w-8"
                                        >
                                            <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                                        </Button>
                                    </Link>
                                )}
                                {type !== "analysis" &&
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => createMutation.mutate()}
                                        disabled={createMutation.isPending}
                                        title="New Analysis"
                                        className="h-8 w-8"
                                    >
                                        <PlusIcon className="w-4 h-4" strokeWidth={1.5} />
                                    </Button>}
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => saveMutation.mutate({})}
                                    disabled={!analysis || saveMutation.isPending}
                                    title="Save"
                                    className="h-8 w-8"
                                >
                                    <Save className="w-4 h-4" strokeWidth={1.5} />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={deleteAnalysis}
                                    disabled={!analysis || deleteMutation.isPending}
                                    title="Delete"
                                    className="h-8 w-8"
                                >
                                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                </Button>
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
                            value={editorValue}
                            onChange={setEditorValue}
                            className="w-full h-full"
                            editorContentClassName="p-5 min-h-[300px]"
                            output="json"
                            placeholder="Enter your analysis..."
                            autofocus={true}
                            editable={true}
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