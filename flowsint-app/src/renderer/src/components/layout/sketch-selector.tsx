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
import { type Analysis } from "@/types";
import { useNavigate, useParams } from "@tanstack/react-router";
import { investigationService } from "@/api/investigation-service";
import { analysisService } from "@/api/analysis-service";
import { Waypoints, FileText } from "lucide-react";


export default function CaseSelector() {
    const navigate = useNavigate()
    const { id, investigationId, type } = useParams({ strict: false })
    const { data: investigation, isLoading: isLoadingInvestigation } = useQuery({
        queryKey: ["dashboard", "investigation", investigationId],
        queryFn: () => investigationService.getById(investigationId as string),
        refetchOnWindowFocus: true,
    })

    const { data: analyses, isLoading: isLoadingAnalyses } = useQuery({
        queryKey: ["analyses", investigationId],
        queryFn: () => analysisService.getByInvestigationId(investigationId as string),
        enabled: !!investigationId,
        refetchOnWindowFocus: true,
    })

    const isLoading = isLoadingInvestigation || isLoadingAnalyses

    const handleSelectionChange = (value: string) => {
        if (value === "overview") {
            navigate({
                to: "/dashboard/investigations/$investigationId",
                params: {
                    investigationId: investigationId as string,
                },
            })
        } else {
            // Check if the selected value is a sketch or analysis
            const isSketch = investigation?.sketches?.some((sketch: Sketch) => sketch.id === value)
            const isAnalysis = analyses?.some((analysis: Analysis) => analysis.id === value)

            const itemType = isSketch ? "graph" : isAnalysis ? "analysis" : type

            navigate({
                to: "/dashboard/investigations/$investigationId/$type/$id",
                params: {
                    investigationId: investigationId as string,
                    type: itemType as string,
                    id: value as string,
                },
            })
        }
    };

    return (
        <div className="flex items-center">
            {isLoading ? <Skeleton className="!h-7 w-40 bg-foreground/10" /> :
                <Select onValueChange={handleSelectionChange} defaultValue={id as string || "overview"}>
                    <SelectTrigger className="min-w-none !h-7 rounded-sm w-full !bg-transparent hover:bg-foreground/10 font-medium shadow-none border-none text-ellipsis truncate gap-1 inset-shadow-none">
                        <SelectValue placeholder="Select a sketch or analysis" className="text-ellipsis truncate" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem className="text-ellipsis truncate" value={"overview"}>{"Overview"}</SelectItem>
                        {investigation?.sketches?.map((sketch: Sketch) => (
                            <SelectItem className="text-ellipsis truncate items-center" key={sketch.id} value={sketch.id}>
                                <div className="flex items-center gap-2">
                                    <Waypoints className="w-4 h-4 text-yellow-500" />
                                    {sketch.title}
                                </div>
                            </SelectItem>
                        ))}
                        {analyses?.map((analysis: Analysis) => (
                            <SelectItem className="text-ellipsis truncate items-center" key={analysis.id} value={analysis.id}>
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    {analysis.title}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select >}
        </div>
    );
}
