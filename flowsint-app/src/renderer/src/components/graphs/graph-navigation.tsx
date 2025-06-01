import { useSketchStore } from "@/stores/sketch-store"
import NodesPanel from "./nodes-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Users } from "lucide-react"
import { ItemsPanel } from "./items-panel"
import DetailsPanel from "./details-panel"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../ui/resizable"

const GraphNavigation = () => {
    const nodes = useSketchStore((s) => s.nodes)
    const currentNode = useSketchStore((s) => s.currentNode)

    return (
        <div className="h-full w-full min-h-0">
            <Tabs defaultValue="entities" className="w-full h-full gap-0 flex flex-col min-w-0">
                <TabsList className="w-full p-0 rounded-none my-0 border-b">
                    <TabsTrigger value="entities"><Users className="h-3 w-3 opacity-60" /> Entities</TabsTrigger>
                    <TabsTrigger value="items"><UserPlus className="h-3 w-3 opacity-60" /> Items</TabsTrigger>
                </TabsList>
                <TabsContent
                    value="entities"
                    className="grow flex flex-col min-h-0 min-w-0 overflow-hidden"
                >
                    <ResizablePanelGroup
                        autoSaveId="conditional"
                        direction="vertical"
                        className="flex-1 min-h-0 flex w-full flex-col"
                    >
                        {currentNode && (
                            <>
                                <ResizablePanel
                                    order={2}
                                    id="infos"
                                    defaultSize={30}
                                    className="flex flex-col w-full overflow-hidden min-h-0 min-w-0"
                                >
                                    <DetailsPanel data={currentNode.data} />
                                </ResizablePanel>
                                <ResizableHandle />
                            </>
                        )}
                        <ResizablePanel
                            order={3}
                            id="nodes"
                            defaultSize={40}
                            className="flex flex-col overflow-hidden min-h-0 min-w-0"
                        >
                            <NodesPanel nodes={nodes} />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </TabsContent>
                <TabsContent
                    value="items"
                    className="my-0 grow h-full overflow-hidden min-h-0"
                >
                    <ItemsPanel />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default GraphNavigation
