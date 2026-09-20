import { sketchService } from '@/api/sketch-service'
import { ActionItem } from '@/lib/action-items'
import { useQuery } from '@tanstack/react-query'

export const useActionItems = (flat = false) => {
  const { data: actionItems, isLoading } = useQuery<ActionItem[]>({
    queryKey: ['actionItems', flat],
    queryFn: () => sketchService.types(flat),
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false // Prevent refetch on component mount if data exists
  })
  return {
    actionItems,
    isLoading
  }
}
