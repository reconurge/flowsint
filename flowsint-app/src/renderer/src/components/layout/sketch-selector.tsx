"use client"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { type Sketch } from "@/types/sketch";
import { sketchService } from "@/api/sketch-service";
import { useNavigate, useParams } from "@tanstack/react-router";


export default function CaseSelector() {
    const navigate = useNavigate()
    const { id, investigationId, type } = useParams({ strict: false })
    const { data: sketches, isLoading } = useQuery({
        queryKey: ["dashboard", "sketches", "selector"],
        queryFn: sketchService.get,
        refetchOnWindowFocus: true,
    })

    const handleSelectionChange = (value: string) => {
        if (value === "overview") {
            navigate({
                to: "/dashboard/investigations/$investigationId",
                params: {
                    investigationId: investigationId as string,
                },
            })
        } else {
            navigate({
                to: "/dashboard/investigations/$investigationId/$type/$id",
                params: {
                    investigationId: investigationId as string,
                    type: type as string,
                    id: id as string,
                },
            })
        }
    };
    return (
        <div className="flex items-center">
            {isLoading ? <Skeleton className="h-7 w-40 bg-foreground/10" /> :
                <Select onValueChange={handleSelectionChange} defaultValue={id as string || "overview"}>
                    <SelectTrigger className="min-w-none h-7 rounded-sm w-full hover:bg-foreground/10 font-medium shadow-none border-none text-ellipsis truncate gap-1 inset-shadow-none">
                        <SelectValue placeholder="Select a sketch" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem className="text-ellipsis truncate" value={"overview"}>{"Overview"}</SelectItem>
                        {sketches?.map((sketch: Sketch) => (
                            <SelectItem className="text-ellipsis truncate items-center" key={sketch.id} value={sketch.id}>{sketch.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select >}
        </div >
    );
}
