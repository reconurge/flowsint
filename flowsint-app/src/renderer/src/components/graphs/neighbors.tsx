import { sketchService } from "@/api/sketch-service";
import { useQuery } from "@tanstack/react-query";
import ForceGraphViewer from "./graph-viewer";

const NeighborsGraph = ({ sketchId, nodeId }: { sketchId: string, nodeId: string }) => {

    const { data: neighborsData, isLoading } = useQuery({
        queryKey: ['neighbors', sketchId, nodeId],
        queryFn: () => sketchService.getNodeNeighbors(sketchId, nodeId),
    });
    return (
        <div className="overflow-hidden bg-background border relative h-full w-full">
            {isLoading ? <div>Loading...</div> :
                <>
                    <div className="top-2 left-2 absolute text-sm"><span className="font-semibold">{neighborsData.nds.length - 1}</span> <span className="opacity-70">neighbor(s)</span></div>
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
                </>}
        </div>
    )
}

export default NeighborsGraph