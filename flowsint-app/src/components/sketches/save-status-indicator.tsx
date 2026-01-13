import { memo } from 'react'
import { useGraphSaveStatus } from '@/stores/graph-save-status-store'
import { SaveStatusBadge } from '@/components/shared/save-status-badge'

export const SaveStatusIndicator = memo(() => {
  const status = useGraphSaveStatus((s) => s.saveStatus)

  return <SaveStatusBadge status={status} />
})

SaveStatusIndicator.displayName = 'SaveStatusIndicator'
