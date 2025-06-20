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
import { type Investigation } from "@/types/investigation";
import { investigationService } from "@/api/investigation-service";
import { useNavigate, useParams } from "@tanstack/react-router";

export default function InvestigationSelector() {
    const navigate = useNavigate()
    const { investigationId } = useParams({ strict: false })

    const { data: investigations, isLoading } = useQuery({
        queryKey: ["dashboard", "selector", investigationId],
        queryFn: investigationService.get,
        refetchOnWindowFocus: true,
    })

    const handleSelectionChange = (value: string) => {
        navigate({
            to: "/dashboard/investigations/$investigationId",
            params: {
                investigationId: value as string,
            },
        })
    };
    return (
        <div className="flex items-center">
            {isLoading ? <Skeleton className="h-7 w-40 bg-foreground/10" /> :
                // @ts-ignore
                <Select onValueChange={handleSelectionChange} defaultValue={investigationId}>
                    <SelectTrigger className="min-w-none !h-7 w-full hover:bg-foreground/10 !bg-transparent rounded-sm font-medium shadow-none border-none text-ellipsis truncate gap-1 inset-shadow-none">
                        <SelectValue placeholder="Select an investigation" />
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
