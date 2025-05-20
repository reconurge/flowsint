"use client"
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
import { useQuery } from "@tanstack/react-query";
import { clientFetch } from "@/lib/client-fetch";
import { Sketch } from "@/types/sketch";


export default function CaseSelector() {
    const router = useRouter()
    const { sketch_id, investigation_id } = useParams()
    const { data: sketches, isLoading } = useQuery({
        queryKey: [process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API, "dashboard", "sketches", "selector", investigation_id, sketch_id],
        queryFn: async () => {
            const data = await clientFetch(`${process.env.NEXT_PUBLIC_FLOWSINT_API}/investigations/${investigation_id}/sketches`)
            return data
        },
        refetchOnWindowFocus: true,
    })

    const handleSelectionChange = (value: string) => {
        value === "overview" ? router.push(`/dashboard/investigations/${investigation_id}`) :
            router.push(`/dashboard/investigations/${investigation_id}/sketches/${value}`);
    };
    return (
        <div className="flex items-center">
            {isLoading ? <Skeleton className="h-8 w-40 bg-foreground/10" /> :
                <Select onValueChange={handleSelectionChange} defaultValue={sketch_id as string || "overview"}>
                    <SelectTrigger className="min-w-none h-8 rounded-sm w-full hover:bg-foreground/10 font-medium shadow-none border-none text-ellipsis truncate gap-1 inset-shadow-none">
                        <SelectValue placeholder="Select a sketch" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem className="text-ellipsis truncate" value={"overview"}>{"Overview"}</SelectItem>
                        {sketches?.map((sketch: Sketch) => (
                            <SelectItem className="text-ellipsis truncate items-center" key={sketch.id} value={sketch.id}>{sketch.title} <Badge variant={"outline"} className="ml-1 rounded-full shadow-none !flex items-center gap-1"><WaypointsIcon className="!h-3 !w-3" />Sketch</Badge></SelectItem>
                        ))}
                    </SelectContent>
                </Select >}
        </div >
    );
}
