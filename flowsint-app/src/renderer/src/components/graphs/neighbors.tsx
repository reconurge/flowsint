import { sketchService } from "@/api/sketch-service";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import ForceGraphViewer from "./force-graph-viewer";

const NeighborsGraph = ({ sketchId, nodeId }: { sketchId: string, nodeId: string }) => {

    const { data: neighborsData, isLoading } = useQuery({
        queryKey: ['neighbors', sketchId, nodeId],
        queryFn: () => sketchService.getNodeNeighbors(sketchId, nodeId),
    });
    return (
        <Card className="border bg-muted/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">
                    Related
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-hidden rounded-lg bg-background border relative">
                    {isLoading ? <div>Loading...</div> : <div className="flex-1 h-[600px] relative">
                        <div className="top-2 left-2 absolute">{neighborsData.nds.length - 1} neighbor(s)</div>
                        <ForceGraphViewer
                            nodes={neighborsData.nds}
                            edges={neighborsData.rls}
                            onNodeClick={() => { }}
                            onNodeRightClick={() => { }}
                            onBackgroundClick={() => { }}
                            showLabels={true}
                            showIcons={true}
                            backgroundColor="transparent"
                            onGraphRef={() => { }}
                        />
                    </div>}
                </div>
            </CardContent>
        </Card>

    )
}

export default NeighborsGraph