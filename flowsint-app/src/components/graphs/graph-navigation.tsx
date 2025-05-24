import { useSketchStore } from "@/store/sketch-store"
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
        <div className="h-full w-full">
            <Tabs defaultValue="entities" className="w-full h-full gap-0 border-b">
                <TabsList className="w-full p-0 rounded-none my-0 border-b" >
                    <TabsTrigger value="entities"><Users className="h-3 w-3 opacity-60" /> Entities</TabsTrigger>
                    <TabsTrigger value="items"><UserPlus className="h-3 w-3 opacity-60" /> Items</TabsTrigger>
                </TabsList>
                <TabsContent value="entities" className="my-0">
                    <ResizablePanelGroup autoSaveId="conditional" direction="vertical">
                        {currentNode && (
                            <>
                                <ResizablePanel order={2} id="infos" defaultSize={30}>
                                    <DetailsPanel data={currentNode.data} />
                                </ResizablePanel>
                                <ResizableHandle withHandle />
                            </>
                        )}
                        <ResizablePanel order={3} id="nodes" defaultSize={40}>
                            <NodesPanel nodes={nodes} />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </TabsContent>
                <TabsContent value="items"><ItemsPanel /></TabsContent>
            </Tabs>
        </div>
    )
}

export default GraphNavigation