import { useState } from "react"
import { useSketchStore } from "@/stores/sketch-store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ArrowRight, ArrowLeftRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { sketchService } from "@/api/sketch-service"
import { useParams } from "@tanstack/react-router"

export function CreateRelationDialog() {

    const { id: sketchId } = useParams({ strict: false })
    const selectedNodes = useSketchStore((state) => state.selectedNodes || [])
    const addEdge = useSketchStore((state) => state.addEdge)
    const openAddRelationDialog = useSketchStore((state) => state.openAddRelationDialog)
    const setOpenAddRelationDialog = useSketchStore((state) => state.setOpenAddRelationDialog)
    const [relationType, setRelationType] = useState("IS_RELATED_TO")
    const [direction, setDirection] = useState<"one-way" | "two-way">("one-way")

    const handleSubmit = async (e: { preventDefault: () => void }) => {
        e.preventDefault()
        try {
            const newEdge = {
                source: selectedNodes[0],
                target: selectedNodes[1],
                type: direction,
                label: relationType,
                sketch_id: sketchId
            }
            const newEdgeObject = { type: newEdge.type, label: relationType, from: newEdge.source.id, to: newEdge.target.id } as any
            if (addEdge) addEdge(newEdgeObject)
            toast.success("Relation successfully added.")
            setOpenAddRelationDialog(false)
            await sketchService.addEdge(sketchId as string, newEdgeObject)
        } catch (error) {
            toast.error("Unexpected error during node creation.")
        } finally {
            setOpenAddRelationDialog(false)
        }
    }

    const getNodeDisplayName = (node: any) => {
        return node.data?.label || node.data?.username || node.id
    }

    return (
        <Dialog open={openAddRelationDialog} onOpenChange={setOpenAddRelationDialog}>
            <DialogContent className="!w-full !max-w-[730px]">
                <DialogHeader>
                    <DialogTitle>New relationship</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Tabs
                        defaultValue="one-way"
                        className="w-full"
                        onValueChange={(value) => setDirection(value as "one-way" | "two-way")}
                    >
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="one-way" className="flex items-center justify-center gap-2">
                                <ArrowRight className="h-4 w-4" />
                                <span>One-way</span>
                            </TabsTrigger>
                            <TabsTrigger value="two-way" className="flex items-center justify-center gap-2">
                                <ArrowLeftRight className="h-4 w-4" />
                                <span>Two-way</span>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="one-way" className="mt-4">
                            <div className="flex items-center gap-2 p-4 border justify-between rounded-lg bg-background">
                                <div className="flex-col min-w-0 items-start">
                                    <div className="text-xs font-medium mb-2">From</div>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedNodes.slice(0, selectedNodes.length - 1).map((node) => (
                                            <Badge key={node.id} variant="outline" className="max-w-full truncate">
                                                {getNodeDisplayName(node)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col w-full items-center justify-center px-2">
                                    <ArrowRight className="h-5 w-5 text-muted-foreground my-1" />
                                    <Input
                                        placeholder="IS_RELATED_TO"
                                        className="w-2/3 mx-auto text-center text-sm"
                                        value={relationType}
                                        onChange={(e) => setRelationType(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex-col min-w-0 items-end">
                                    <div className="text-xs font-medium mb-2">To</div>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedNodes.slice(-1).map((node) => (
                                            <Badge key={node.id} variant="outline" className="max-w-full truncate">
                                                {getNodeDisplayName(node)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="two-way" className="mt-4">
                            <div className="flex items-center gap-2 p-4 border rounded-lg bg-background">
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium mb-2">Nodes</div>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedNodes.map((node) => (
                                            <Badge key={node.id} variant="outline" className="max-w-full truncate">
                                                {getNodeDisplayName(node)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col items-center px-2">
                                    <ArrowLeftRight className="h-5 w-5 text-muted-foreground my-1" />
                                    <Input
                                        placeholder="Type de relation"
                                        className="w-32 text-center text-sm"
                                        value={relationType}
                                        onChange={(e) => setRelationType(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpenAddRelationDialog(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!relationType.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
