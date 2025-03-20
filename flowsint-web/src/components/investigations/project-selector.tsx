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
import { useQuery } from "@tanstack/react-query";
import { Project } from "@/types/project";

export default function ProjectSelector() {
    const router = useRouter()
    const { project_id, investigation_id } = useParams()
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
    const { investigation } = useInvestigationData(project_id as string, investigation_id as string);
    const projects = data?.projects || []

    const handleSelectionChange = (value: string) => {
        router.push(`/dashboard/projects/${value}`);
    };
    return (
        <div className="flex items-center">
            {isLoading || investigation.isLoading ? <Skeleton className="h-8 w-40 bg-foreground/10" /> :
                <Select onValueChange={handleSelectionChange} defaultValue={investigation?.data?.project?.id}>
                    <SelectTrigger className="min-w-none w-full hover:bg-sidebar-accent shadow-none border-none text-ellipsis truncate gap-1">
                        <SelectValue defaultValue={investigation?.data?.title || ""} placeholder="Select an investigation" />
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
