import * as React from 'react'
import { Spinner } from '../../../components/spinner'
import { cn } from '@/lib/utils'

export const ImageOverlay = React.memo(() => {
  return (
    <div
      className={cn(
        'flex flex-row items-center justify-center',
        'absolute inset-0 rounded-mdbg-[var(--mt-overlay)] opacity-100 transition-opacity'
      )}
    >
      <Spinner className="size-7" />
    </div>
  )
})

ImageOverlay.displayName = 'ImageOverlay'
