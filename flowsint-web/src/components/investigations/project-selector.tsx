"use client"
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
import { useQuery } from "@tanstack/react-query";
import { Project } from "@/types/project";

export default function ProjectSelector() {
    const router = useRouter()
    const { project_id } = useParams()
    const { data, isLoading } = useQuery({
        queryKey: ["dashboard", "projects"],
        queryFn: async () => {
            const res = await fetch(`/api/projects`)
            return res.json()
        },
        refetchOnWindowFocus: true,
    })
    const useInvestigationData = useInvestigationStore(
        (state) => state.useInvestigationData
    );
    const projects = data?.projects || []

    const handleSelectionChange = (value: string) => {
        router.push(`/dashboard/projects/${value}`);
    };
    return (
        <div className="flex items-center">
            {isLoading ? <Skeleton className="h-7 w-40 bg-foreground/10" /> :
                // @ts-ignore
                <Select onValueChange={handleSelectionChange} defaultValue={project_id}>
                    <SelectTrigger className="min-w-none w-full hover:bg-sidebar-accent font-medium shadow-none border-none text-ellipsis truncate gap-1">
                        <SelectValue placeholder="Select an investigation" />
                    </SelectTrigger>
                    <SelectContent>
                        {projects?.map((project: Project) => (
                            <SelectItem className="text-ellipsis truncate" key={project.id} value={project.id}>{project.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select >}
        </div>
    );
}
