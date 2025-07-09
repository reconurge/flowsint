import { sketchService } from "@/api/sketch-service"
import { ActionItem } from "@/lib/action-items"
import { useQuery } from "@tanstack/react-query"

export const useActionItems = () => {
    const { data: actionItems, isLoading } = useQuery<ActionItem[]>({
        queryKey: ["actionItems"],
        queryFn: () => sketchService.types(),
        staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
        refetchOnWindowFocus: false, // Prevent refetch on window focus
        refetchOnMount: false, // Prevent refetch on component mount if data exists
    })
    return {
        actionItems,
        isLoading
    }
}