import { sketchService } from "@/api/sketch-service";
import { useQuery } from "@tanstack/react-query";
import ForceGraphViewer from "../graph-viewer";
import Loader from "@/components/loader";

const NeighborsGraph = ({ sketchId, nodeId }: { sketchId: string, nodeId: string }) => {

    const { data: neighborsData, isLoading } = useQuery({
        queryKey: ['neighbors', sketchId, nodeId],
        queryFn: () => sketchService.getNodeNeighbors(sketchId, nodeId),
    });
    return (
        <div className="overflow-hidden bg-background border relative h-full w-full">
            {isLoading ? <div className='flex items-center justify-center grow h-full'><Loader /></div> :
                <>
                    <div className="top-0 left-0 bg-card/60 backdrop-blur z-10 p-1 rounded-br-lg absolute text-sm flex gap-1">
                        <span className="font-semibold">{neighborsData.nds.length - 1}</span>
                        <span className="opacity-70">neighbor(s)</span>
                    </div>
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
                        instanceId="neighbors"
                    />
                </>}
        </div>
    )
}

export default NeighborsGraph