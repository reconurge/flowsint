"use client"
import { useInvestigations } from "@/lib/hooks/investigation/investigation";
import { useInvestigationStore } from '@/store/investigation-store';
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
    const { investigation_id, project_id } = useParams()
    const useInvestigationData = useInvestigationStore(
        (state) => state.useInvestigationData
    );
    const { investigations, isLoading } = useInvestigations(project_id as string)
    const { investigation } = useInvestigationData(project_id as string, investigation_id as string);

    const handleSelectionChange = (value: string) => {
        value === "overview" ? router.push(`/dashboard/projects/${project_id}`) :
            router.push(`/dashboard/projects/${project_id}/investigations/${value}`);
    };
    return (
        <div className="flex items-center">
            {isLoading || investigation.isLoading ? <Skeleton className="h-8 w-40 bg-foreground/10" /> :
                <Select onValueChange={handleSelectionChange} defaultValue={investigation?.data.id}>
                    <SelectTrigger className="min-w-none h-8 rounded-sm w-full hover:bg-sidebar-accent font-medium shadow-none border-none text-ellipsis truncate gap-1">
                        <SelectValue defaultValue={investigation?.data?.title || ""} placeholder="Select an investigation" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem className="text-ellipsis truncate" value={"overview"}>{"Overview"}</SelectItem>
                        {investigations?.map((investigation) => (
                            <SelectItem className="text-ellipsis truncate items-center" key={investigation.id} value={investigation.id}>{investigation.title} <Badge variant={"outline"} className="ml-1 rounded-full shadow-none !flex items-center gap-1"><WaypointsIcon className="!h-3 !w-3" />Sketch</Badge></SelectItem>
                        ))}
                    </SelectContent>
                </Select >}
        </div >
    );
}
