import { sketchService } from '@/api/sketch-service'
import { ActionItem } from '@/lib/action-items'
import { useQuery } from '@tanstack/react-query'

export const useActionItems = () => {
  const { data: actionItems, isLoading } = useQuery<ActionItem[]>({
    queryKey: ['actionItems'],
    queryFn: () => sketchService.types(),
  })
  return {
    actionItems,
    isLoading
  }
}
