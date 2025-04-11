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
import { useQuery } from "@tanstack/react-query";
import { Investigation } from "@/types/investigation";
import { Badge } from '../ui/badge';

export default function InvestigationSelector() {
    const router = useRouter()
    const { investigation_id } = useParams()
    const { data, isLoading } = useQuery({
        queryKey: ["dashboard", "investigations"],
        queryFn: async () => {
            const res = await fetch(`/api/investigations`)
            return res.json()
        },
        refetchOnWindowFocus: true,
    })
    const investigations = data?.investigations || []

    const handleSelectionChange = (value: string) => {
        router.push(`/dashboard/investigations/${value}`);
    };
    return (
        <div className="flex items-center">
            {isLoading ? <Skeleton className="h-8 w-40 bg-foreground/10" /> :
                // @ts-ignore
                <Select onValueChange={handleSelectionChange} defaultValue={investigation_id}>
                    <SelectTrigger className="min-w-none h-8 w-full hover:bg-sidebar-accent rounded-sm font-medium shadow-none border-none text-ellipsis truncate gap-1">
                        <SelectValue placeholder="Select an investigation" /><Badge variant="outline" className="ml-1 rounded-full shadow-none">Case</Badge>
                    </SelectTrigger>
                    <SelectContent>
                        {investigations?.map((investigation: Investigation) => (
                            <SelectItem className="text-ellipsis truncate" key={investigation.id} value={investigation.id}>{investigation.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select >}
        </div>
    );
}
