import { Loader2 } from 'lucide-react'

interface GraphLoadingOverlayProps {
  isVisible: boolean
}

export const GraphLoadingOverlay: React.FC<GraphLoadingOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/30">
      <div className="flex flex-col items-center gap-3 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium text-foreground">Regenerating layout...</span>
      </div>
    </div>
  )
}
