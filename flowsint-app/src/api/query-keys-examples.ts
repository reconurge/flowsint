// // Examples of how to use the Query Key Factory with your existing hooks
// // This file demonstrates the proper usage patterns

// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// import { queryKeys } from './query-keys'
// import { analysisService } from './analysis-service'
// import { investigationService } from './investigation-service'
// import { sketchService } from './sketch-service'
// import { chatCRUDService } from './chat-service'
// import { KeyService } from './key-service'
// import { logService } from './log-service'
// import { scanService } from './scan-service'
// import { enricherService } from './enricher-service'

// // Example 1: Using the query keys directly
// export const useInvestigationsList = () => {
//   return useQuery({
//     queryKey: queryKeys.investigations.list,
//     queryFn: investigationService.get
//   })
// }

// export const useInvestigationDetail = (investigationId: string) => {
//   return useQuery({
//     queryKey: queryKeys.investigations.detail(investigationId),
//     queryFn: () => investigationService.getById(investigationId),
//     enabled: !!investigationId
//   })
// }

// export const useInvestigationAnalyses = (investigationId: string) => {
//   return useQuery({
//     queryKey: queryKeys.investigations.analyses(investigationId),
//     queryFn: () => analysisService.getByInvestigationId(investigationId),
//     enabled: !!investigationId
//   })
// }

// // Example 2: Using the individual key groups
// export const useSketchesList = () => {
//   return useQuery({
//     queryKey: queryKeys.sketches.list,
//     queryFn: sketchService.get
//   })
// }

// export const useSketchDetail = (sketchId: string) => {
//   return useQuery({
//     queryKey: queryKeys.sketches.detail(sketchId),
//     queryFn: () => sketchService.getById(sketchId),
//     enabled: !!sketchId
//   })
// }

// export const useSketchGraph = (investigationId: string, sketchId: string) => {
//   return useQuery({
//     queryKey: queryKeys.sketches.graph(investigationId, sketchId),
//     queryFn: () => sketchService.getById(sketchId),
//     enabled: !!investigationId && !!sketchId
//   })
// }

// }

// export const useUpdateAnalysis = () => {
//   const queryClient = useQueryClient()

//   return useMutation({
//     mutationFn: async ({ analysisId, data }: { analysisId: string; data: any }) => {
//       return analysisService.update(analysisId, JSON.stringify(data))
//     },
//     onSuccess: (data, variables) => {
//       // Update the cache directly for better UX
//       queryClient.setQueryData(queryKeys.analyses.detail(variables.analysisId), data)

//       // Invalidate related queries
//       queryClient.invalidateQueries({
//         queryKey: queryKeys.analyses.byInvestigation(data.investigation_id)
//       })
//     }
//   })
// }

// // Example 4: Using with chat functionality
// export const useChatDetail = (chatId: string) => {
//   return useQuery({
//     queryKey: queryKeys.chats.detail(chatId),
//     queryFn: () => chatCRUDService.getById(chatId),
//     enabled: !!chatId
//   })
// }

// export const useChatsByInvestigation = (investigationId: string) => {
//   return useQuery({
//     queryKey: queryKeys.chats.byInvestigation(investigationId),
//     queryFn: () => chatCRUDService.getByInvestigationId(investigationId),
//     enabled: !!investigationId
//   })
// }

// // Example 5: Using with logs and events
// export const useLogsBySketch = (sketchId: string) => {
//   return useQuery({
//     queryKey: queryKeys.logs.bySketch(sketchId),
//     queryFn: () => logService.get(sketchId),
//     enabled: !!sketchId,
//     staleTime: 30_000 // 30 seconds
//   })
// }

// // Example 6: Using with API keys
// export const useKeysList = () => {
//   return useQuery({
//     queryKey: queryKeys.keys.list,
//     queryFn: KeyService.get
//   })
// }

// export const useKeyDetail = (keyId: string) => {
//   return useQuery({
//     queryKey: queryKeys.keys.detail(keyId),
//     queryFn: () => KeyService.getById(keyId),
//     enabled: !!keyId
//   })
// }

// // Example 7: Using with scans
// export const useScanDetail = (scanId: string) => {
//   return useQuery({
//     queryKey: queryKeys.scans.detail(scanId),
//     queryFn: () => scanService.get(scanId),
//     enabled: !!scanId
//   })
// }

// // Example 8: Using with enrichers
// export const useEnrichersList = () => {
//   return useQuery({
//     queryKey: queryKeys.enrichers.list,
//     queryFn: enricherService.get
//   })
// }

// // Example 9: Complex invalidation patterns
// export const useDeleteInvestigation = () => {
//   const queryClient = useQueryClient()

//   return useMutation({
//     mutationFn: investigationService.delete,
//     onSuccess: (data, variables) => {
//       // Invalidate all investigation-related queries
//       queryClient.invalidateQueries({
//         queryKey: queryKeys.investigations.list
//       })

//       // Invalidate all related data
//       queryClient.invalidateQueries({
//         queryKey: queryKeys.investigations.detail(variables)
//       })

//       // Clear related caches
//       queryClient.removeQueries({
//         queryKey: queryKeys.investigations.analyses(variables)
//       })

//       queryClient.removeQueries({
//         queryKey: queryKeys.investigations.sketches(variables)
//       })

//       queryClient.removeQueries({
//         queryKey: queryKeys.investigations.flows(variables)
//       })
//     }
//   })
// }

// // Example 10: Prefetching with query keys
// export const usePrefetchInvestigation = () => {
//   const queryClient = useQueryClient()

//   return (investigationId: string) => {
//     queryClient.prefetchQuery({
//       queryKey: queryKeys.investigations.detail(investigationId),
//       queryFn: () => investigationService.getById(investigationId)
//     })

//     // Also prefetch related data
//     queryClient.prefetchQuery({
//       queryKey: queryKeys.investigations.analyses(investigationId),
//       queryFn: () => analysisService.getByInvestigationId(investigationId)
//     })
//   }
// }
