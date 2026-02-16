import { keyService } from '@/api/key-service'
import { useQuery } from '@tanstack/react-query'

interface ActiveChatState {
  exists: boolean
}

export const useIsChatActive = () => {
  const { data: status, isLoading } = useQuery<ActiveChatState>({
    queryKey: ['is_chat_active'],
    queryFn: keyService.chatKeyExists,
    refetchOnMount: true
  })
  return {
    exists: status?.exists,
    isLoading
  }
}
