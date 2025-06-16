import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { MinimalTiptapEditor } from "@/components/analyses/editor"
import { analysisService } from "@/api/analysis-service"
import type { Analysis } from "@/types"
import { Link, useParams } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusIcon, Trash2, Save, ChevronsRight, Sparkles, ChevronDown, XIcon, ExternalLink } from "lucide-react"
import { useAnalysisPanelStore } from "@/stores/analysis-panel-store"
import { toast } from "sonner"
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut"
import { useConfirm } from "../use-confirm-dialog"
import { useLayoutStore } from "@/stores/layout-store"
import { useChat } from "@/hooks/use-chat"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Editor } from "@tiptap/core"

export const AnalysisPanel = () => {
    const { investigationId } = useParams({ strict: false }) as { investigationId: string }
    const toggleChat = useLayoutStore(s => s.toggleChat)
    const currentAnalysisId = useAnalysisPanelStore(s => s.currentAnalysisId)
    const setCurrentAnalysisId = useAnalysisPanelStore(s => s.setCurrentAnalysisId)
    const { confirm } = useConfirm()
    // State for editor
    const [editorValue, setEditorValue] = useState<any>("")
    const [titleValue, setTitleValue] = useState("")
    const [editor, setEditor] = useState<Editor | undefined>(undefined)
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [includeContext, setIncludeContext] = useState(false)
    // Chat hook
    const {
        isAiLoading,
        promptOpen,
        setPromptOpen,
        customPrompt,
        setCustomPrompt,
        handleCustomPrompt
    } = useChat({
        onContentUpdate: setEditorValue,
        onSuccess: () => saveMutation.mutate({}),
        editor: editor
    })

    // Fetch all analyses for this investigation
    const { data: analyses, isLoading: isLoadingAnalyses, isError, refetch } = useQuery<Analysis[]>({
        queryKey: ["analyses", investigationId],
        queryFn: () => analysisService.getByInvestigationId(investigationId),
        enabled: !!investigationId,
    })
    // Find the current analysis
    const currentAnalysis = Array.isArray(analyses) ? analyses?.find(a => a.id === currentAnalysisId) || (analyses && analyses[0]) : null

    // Set currentAnalysisId to first if not set
    useEffect(() => {
        if (analyses && analyses.length > 0 && (!currentAnalysisId || !analyses.some(a => a.id === currentAnalysisId))) {
            setCurrentAnalysisId(analyses[0].id)
        }
        if (analyses && analyses.length === 0) {
            setCurrentAnalysisId(null)
        }
    }, [analyses, currentAnalysisId, setCurrentAnalysisId])

    // Add title update mutation
    const updateTitleMutation = useMutation({
        mutationFn: async (newTitle: string) => {
            if (!currentAnalysis) return
            return analysisService.update(currentAnalysis.id, JSON.stringify({
                ...currentAnalysis,
                title: newTitle
            }))
        },
        onSuccess: async () => {
            await refetch()
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
        onSuccess: async (data) => {
            await refetch()
            setCurrentAnalysisId(data.id)
            toast.success("New analysis created")
        },
        onError: (error) => {
            toast.error("Failed to create analysis: " + (error instanceof Error ? error.message : "Unknown error"))
        }
    })

    const saveMutation = useMutation({
        mutationFn: async (updated: Partial<Analysis>) => {
            if (!currentAnalysis) return
            return analysisService.update(currentAnalysis.id, JSON.stringify({
                ...currentAnalysis,
                ...updated,
                content: editorValue
            }))
        },
        onSuccess: async () => {
            await refetch()
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
            await refetch()
            // Set to another analysis or null
            if (analyses && analyses.length > 1) {
                const next = analyses.find(a => a.id !== currentAnalysisId)
                setCurrentAnalysisId(next?.id || null)
            } else {
                setCurrentAnalysisId(null)
            }
            toast.success("Analysis deleted")
        },
        onError: (error) => {
            toast.error("Failed to delete analysis: " + (error instanceof Error ? error.message : "Unknown error"))
        }
    })

    const deleteAnalysis = async () => {
        if (!currentAnalysisId) {
            toast.error("No analysis selected")
            return
        }
        if (!await confirm({ title: "Delete Analysis", message: "Are you sure you want to delete this analysis?" })) {
            return
        }
        deleteMutation.mutate(currentAnalysisId)
    }

    useEffect(() => {
        if (currentAnalysis) {
            // Handle both string content and object content
            const content = currentAnalysis.content
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
            setTitleValue(currentAnalysis.title || "")
        } else {
            // Reset when no analysis is selected
            setEditorValue("")
            setTitleValue("")
            if (editor) {
                editor.commands.setContent("")
            }
        }
    }, [currentAnalysisId, currentAnalysis?.id, currentAnalysis?.content, currentAnalysis?.title, editor])

    useKeyboardShortcut({
        key: "s",
        ctrlOrCmd: true,
        callback: () => {
            saveMutation.mutate({})
        },
    })

    useKeyboardShortcut({
        key: "e",
        ctrlOrCmd: true,
        callback: () => setPromptOpen(!promptOpen),
    })

    if (isLoadingAnalyses) {
        return <Skeleton className="h-full w-full" />
    }

    if (isError) {
        return <div className="text-sm text-destructive">Error loading analyses.</div>
    }
    
    return (
        <div className="flex flex-col h-full w-full">
            {/* Header with unified title/analysis selector and controls */}
            <div className="border-b bg-background h-10 w-full flex items-center justify-between">
                <div className="flex items-center justify-between p-3 w-full">
                    {/* Left section with navigation and title */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Button className="h-8 w-8" variant="ghost" onClick={toggleChat}>
                            <ChevronsRight />
                        </Button>
                        {isLoadingAnalyses ? (
                            <Skeleton className="h-9 w-64" />
                        ) : isError ? (
                            <div className="text-sm text-destructive">Error loading analyses</div>
                        ) : analyses && analyses.length > 0 ? (
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0" align="start">
                                        <div className="flex flex-col">
                                            {analyses.map((analysis) => (
                                                <Button
                                                    key={analysis.id}
                                                    variant="ghost"
                                                    className="justify-start px-2 py-1.5 h-auto"
                                                    onClick={() => setCurrentAnalysisId(analysis.id)}
                                                >
                                                    <div className="flex flex-col items-start">
                                                        <span className="font-medium">{analysis.title || "Untitled"}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {analysis.id === currentAnalysisId ? "Current" : "Switch to this analysis"}
                                                        </span>
                                                    </div>
                                                </Button>
                                            ))}
                                            <Button
                                                variant="ghost"
                                                className="justify-start px-2 py-1.5 h-auto text-primary"
                                                onClick={() => createMutation.mutate()}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <PlusIcon className="w-4 h-4" />
                                                    <span>Create new analysis</span>
                                                </div>
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
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
                                                    setTitleValue(currentAnalysis?.title || "")
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
                        ) : (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="text-sm font-bold text-muted-foreground/60 truncate text-ellipsis">No analyses yet</div>
                            </div>
                        )}
                    </div>
                    {/* <div className="grow" /> */}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                        <Link to="/dashboard/investigations/$investigationId/$type/$id" params={{
                            investigationId,
                            type: "analysis",
                            id: currentAnalysisId as string
                        }}>
                            <Button
                                size="icon"
                                variant="ghost"
                                disabled={!currentAnalysis || isAiLoading}
                                title="AI Prompt"
                                className="h-8 w-8"
                                onClick={() => setPromptOpen(!promptOpen)}
                            >
                                <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                            </Button>
                        </Link>
                        <Button
                            size="icon"
                            variant="ghost"
                            disabled={!currentAnalysis || isAiLoading}
                            title="AI Prompt"
                            className="h-8 w-8"
                            onClick={() => setPromptOpen(!promptOpen)}
                        >
                            <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => createMutation.mutate()}
                            disabled={createMutation.isPending}
                            title="New Analysis"
                            className="h-8 w-8"
                        >
                            <PlusIcon className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => saveMutation.mutate({})}
                            disabled={!currentAnalysis || saveMutation.isPending}
                            title="Save"
                            className="h-8 w-8"
                        >
                            <Save className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={deleteAnalysis}
                            disabled={!currentAnalysis || deleteMutation.isPending}
                            title="Delete"
                            className="h-8 w-8"
                        >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 min-h-0 flex flex-col">
                {currentAnalysis ? (
                    <>
                        <div className="flex-1 h-full w-full">
                            <MinimalTiptapEditor
                                key={currentAnalysisId}
                                immediatelyRender={true}
                                value={editorValue}
                                onChange={setEditorValue}
                                className="w-full flex-1"
                                editorContentClassName="p-5 min-h-[300px]"
                                output="json"
                                placeholder="Enter your analysis..."
                                autofocus={true}
                                editable={true}
                                editorClassName="focus:outline-hidden"
                                onEditorReady={setEditor}
                            />
                        </div>
                        {/* Prompt Panel */}
                        <div className={`border-t bg-background transition-all duration-200 ${promptOpen ? 'h-[300px]' : 'h-0'}`}>
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between p-2 border-b">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                                        <span className="text-sm font-medium">AI Prompt</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setPromptOpen(false)}
                                        className="h-6 w-6 px-2"
                                    >
                                        <XIcon />
                                    </Button>
                                </div>
                                <div className="flex-1 p-2 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIncludeContext(!includeContext)}
                                            className="h-6 px-2"
                                        >
                                            {includeContext ? "Hide Context" : "Show Context"}
                                        </Button>
                                        {includeContext && (
                                            <span className="text-xs text-muted-foreground">
                                                Current analysis content will be included as context
                                            </span>
                                        )}
                                    </div>
                                    {includeContext && (
                                        <Textarea
                                            autoFocus
                                            value={JSON.stringify(editorValue, null, 2)}
                                            readOnly
                                            className="h-[100px] text-xs font-mono resize-none"
                                        />
                                    )}
                                    <Textarea
                                        placeholder="Enter your prompt..."
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        className="flex-1 resize-none"
                                    />
                                </div>
                                <div className="p-2 border-t">
                                    <Button
                                        onClick={() => handleCustomPrompt(editorValue)}
                                        disabled={!customPrompt.trim() || isAiLoading}
                                        className="w-full"
                                    >
                                        {isAiLoading ? "Generating..." : "Generate"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                        <div>No analysis selected.</div>
                        {analyses && analyses.length === 0 && (
                            <Button
                                className="shadow-none"
                                variant="outline"
                                onClick={() => createMutation.mutate()}
                                disabled={createMutation.isPending}
                            >
                                <PlusIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />
                                Create your first analysis
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AnalysisPanel