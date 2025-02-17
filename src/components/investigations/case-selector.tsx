import { useInvestigations } from "@/lib/hooks/investigation/investigation";
import { useInvestigationContext } from "../contexts/investigation-provider";
import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton";

export default function CaseSelector() {
    const router = useRouter()
    const { investigations, isLoading } = useInvestigations()
    const { investigation, isLoadingInvestigation } = useInvestigationContext()
    const handleSelectionChange = (value: string) => {
        router.push(`/investigations/${value}`);
    };
    return (
        <div className="flex items-center">
            {isLoading || isLoadingInvestigation ? <Skeleton className="h-8 w-40 bg-foreground/10" /> :
                <Select onValueChange={handleSelectionChange} defaultValue={investigation?.id}>
                    <SelectTrigger className="min-w-none w-full hover:bg-sidebar-accent shadow-none border-none text-ellipsis truncate gap-1">
                        <SelectValue defaultValue={investigation?.title || ""} placeholder="Select an investigation" />
                    </SelectTrigger>
                    <SelectContent>
                        {investigations?.map((investigation) => (
                            <SelectItem className="text-ellipsis truncate" key={investigation.id} value={investigation.id}>{investigation.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select >}
        </div>
    );
}
