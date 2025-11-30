import { analysisService } from "@/api/analysis-service"
import { Analysis } from "@/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import default_content from '@/components/analyses/default_content.json'
import { queryKeys } from "@/api/query-keys"
import { toast } from "sonner"

export const useCreateAnalysis = (investigationId: string, onAnalysisCreate?: any) => {

    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const newAnalysis: Partial<Analysis> = {
                title: 'Untitled Analysis',
                investigation_id: investigationId,
                content: default_content
            }
            const res = await analysisService.create(JSON.stringify(newAnalysis))
            return res
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.analyses.byInvestigation(investigationId || '')
            })
            onAnalysisCreate?.(investigationId)
            toast.success('New analysis created')
        },
        onError: (error) => {
            toast.error(
                'Failed to create analysis: ' + (error instanceof Error ? error.message : 'Unknown error')
            )
        }
    })
}