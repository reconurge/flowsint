import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { MinimalTiptapEditor } from "@/components/shared/editor"
import { analysisService } from "@/api/analysis-service"
import type { Analysis } from "@/types"
import { useParams } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { PlusIcon, Trash2, Save } from "lucide-react"
import { useAnalysisPanelStore } from "@/stores/analysis-panel-store"
import { toast } from "sonner"
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut"
import { useConfirm } from "../use-confirm-dialog"

export const AnalysisPanel = () => {
    const { investigationId } = useParams({ strict: false }) as { investigationId: string }
    const currentAnalysisId = useAnalysisPanelStore(s => s.currentAnalysisId)
    const setCurrentAnalysisId = useAnalysisPanelStore(s => s.setCurrentAnalysisId)
    const { confirm } = useConfirm()


    // Fetch all analyses for this investigation
    const { data: analyses, isLoading: isLoadingAnalyses, isError, refetch } = useQuery<Analysis[]>({
        queryKey: ["analyses", investigationId],
        queryFn: () => analysisService.getByInvestigationId(investigationId),
        enabled: !!investigationId,
    })
    // Find the current analysis
    const currentAnalysis = analyses?.find(a => a.id === currentAnalysisId) || (analyses && analyses[0])

    // Set currentAnalysisId to first if not set
    useEffect(() => {
        if (analyses && analyses.length > 0 && (!currentAnalysisId || !analyses.some(a => a.id === currentAnalysisId))) {
            setCurrentAnalysisId(analyses[0].id)
        }
        if (analyses && analyses.length === 0) {
            setCurrentAnalysisId(null)
        }
    }, [analyses, currentAnalysisId, setCurrentAnalysisId])

    // State for editor
    const [editorValue, setEditorValue] = useState<any>("")
    const [titleValue, setTitleValue] = useState("")

    useEffect(() => {
        if (currentAnalysis) {
            // Handle both string content and object content
            const content = currentAnalysis.content
            if (typeof content === 'string') {
                try {
                    // Try to parse if it's a JSON string
                    setEditorValue(JSON.parse(content))
                } catch {
                    // If parsing fails, treat as plain text and convert to editor format
                    setEditorValue(content || "")
                }
            } else {
                // If it's already an object, use it directly
                setEditorValue(content || "")
            }
            console.log("Setting editorValue:", content)
            setTitleValue(currentAnalysis.title || "")
        } else {
            // Reset when no analysis is selected
            setEditorValue("")
            setTitleValue("")
            console.log("Resetting editorValue")
        }
    }, [currentAnalysisId, currentAnalysis?.id, currentAnalysis?.content, currentAnalysis?.title])

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

    useKeyboardShortcut({
        key: "s",
        ctrlOrCmd: true,
        callback: () => {
            saveMutation.mutate({})
        },
    })

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header with unified title/analysis selector and controls */}
            <div className="border-b bg-background">
                <div className="flex items-center justify-between p-4">
                    {/* Unified title and analysis selector */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isLoadingAnalyses ? (
                            <Skeleton className="h-9 w-64" />
                        ) : isError ? (
                            <div className="text-sm text-destructive">Error loading analyses</div>
                        ) : analyses && analyses.length > 0 ? (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Select
                                    value={currentAnalysisId || ""}
                                    onValueChange={(value) => setCurrentAnalysisId(value)}
                                >
                                    <SelectTrigger className="border-none shadow-none bg-transparent hover:bg-muted/20 focus:bg-muted/30 p-2 h-auto min-w-0 flex-1">
                                        <div className="flex flex-col items-start min-w-0 flex-1">
                                            <input
                                                className="text-xl font-bold bg-transparent outline-none border-none p-0 m-0 w-full placeholder:text-muted-foreground/60"
                                                value={titleValue}
                                                onChange={e => setTitleValue(e.target.value)}
                                                placeholder="Untitled Analysis"
                                                disabled={!currentAnalysis}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="shadow-none border-muted">
                                        {analyses.map((analysis) => (
                                            <SelectItem key={analysis.id} value={analysis.id}>
                                                <div className="flex flex-col items-start">
                                                    <span className="font-medium">{analysis.title || "Untitled"}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {analysis.id === currentAnalysisId ? "Current" : "Switch to this analysis"}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="text-sm font-bold text-muted-foreground/60 truncate text-ellipsis">No analyses yet</div>
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
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
            <div className="flex-1 min-h-0">
                {currentAnalysis ? (
                    <MinimalTiptapEditor
                        key={currentAnalysisId}
                        immediatelyRender={false}
                        value={editorValue}
                        onChange={setEditorValue}
                        className="w-full h-full"
                        editorContentClassName="p-5 min-h-[300px]"
                        output="json"
                        placeholder="Enter your analysis..."
                        autofocus={true}
                        editable={true}
                        editorClassName="focus:outline-hidden"
                    />
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