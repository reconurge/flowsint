"use client"
import { useSketches } from "@/lib/hooks/sketches";
import { useSketchStore } from '@/store/sketch-store';
import { useParams, useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton";
import { WaypointsIcon } from "lucide-react";
import { Badge } from "../ui/badge";

export default function CaseSelector() {
    const router = useRouter()
    const { sketch_id, investigation_id } = useParams()
    const useSketchData = useSketchStore(
        (state) => state.useSketchData
    );
    const { sketches, isLoading } = useSketches(investigation_id as string)
    const { sketch } = useSketchData(investigation_id as string, sketch_id as string);

    const handleSelectionChange = (value: string) => {
        value === "overview" ? router.push(`/dashboard/investigations/${investigation_id}`) :
            router.push(`/dashboard/investigations/${investigation_id}/sketches/${value}`);
    };
    return (
        <div className="flex items-center">
            {isLoading || sketch.isLoading ? <Skeleton className="h-8 w-40 bg-foreground/10" /> :
                <Select onValueChange={handleSelectionChange} defaultValue={sketch?.data?.id}>
                    <SelectTrigger className="min-w-none h-8 rounded-sm w-full hover:bg-foreground/10 font-medium shadow-none border-none text-ellipsis truncate gap-1">
                        <SelectValue defaultValue={sketch?.data?.title || ""} placeholder="Select an investigation" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem className="text-ellipsis truncate" value={"overview"}>{"Overview"}</SelectItem>
                        {sketches?.map((sketch) => (
                            <SelectItem className="text-ellipsis truncate items-center" key={sketch.id} value={sketch.id}>{sketch.title} <Badge variant={"outline"} className="ml-1 rounded-full shadow-none !flex items-center gap-1"><WaypointsIcon className="!h-3 !w-3" />Sketch</Badge></SelectItem>
                        ))}
                    </SelectContent>
                </Select >}
        </div >
    );
}
