import { logService } from '@/api/log-service'
import { useConfirm } from '../use-confirm-dialog'
import { useParams } from '@tanstack/react-router'
import { memo } from 'react'
import { useEvents } from '@/hooks/use-events'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { TerminalLogViewer } from '../terminal'

export const LogPanel = memo(() => {
  const { id: sketch_id } = useParams({ strict: false })
  const { confirm } = useConfirm()
  const { logs, refetch } = useEvents(sketch_id as string)
  const queryClient = useQueryClient()

  // Delete logs mutation
  const deleteLogsMutation = useMutation({
    mutationFn: logService.delete,
    onSuccess: () => {
      // Invalidate logs for this sketch
      if (sketch_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.logs.bySketch(sketch_id)
        })
      }
      refetch()
    },
    onError: (error) => {
      console.error('Error deleting logs:', error)
    }
  })

  const handleDeleteLogs = async () => {
    if (!sketch_id) return
    if (
      !(await confirm({
        title: 'Delete all logs',
        message: 'Are you sure you want to delete all logs?'
      }))
    )
      return
    await deleteLogsMutation.mutateAsync(sketch_id)
  }

  return (
    <div className="h-full overflow-hidden border-t p-2">
      <TerminalLogViewer
        logs={logs}
        onRefresh={refetch}
        onClear={handleDeleteLogs}
      />
    </div>
  )
})
