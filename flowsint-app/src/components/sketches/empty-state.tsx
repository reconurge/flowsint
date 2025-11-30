import { PlusIcon, Zap, GitBranch } from 'lucide-react'
import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useGraphStore } from '@/stores/graph-store'

const EmptyState = memo(() => {
  const setOpenMainDialog = useGraphStore((state) => state.setOpenMainDialog)

  const handleOpenNewAddItemDialog = useCallback(() => {
    setOpenMainDialog(true)
  }, [setOpenMainDialog])

  return (
    <div className="flex relative bg-background gap-8 h-full flex-col w-full items-center justify-center">
      {/* Animated Graph Illustration */}
      <div className="relative">
        <svg width="200" height="120" viewBox="0 0 200 120" className="opacity-40">
          {/* Connections */}
          <g className="stroke-muted-foreground/30 fill-none stroke-2">
            <line
              x1="40"
              y1="40"
              x2="90"
              y2="60"
              className="animate-pulse"
              style={{ animationDelay: '0s' }}
            />
            <line
              x1="90"
              y1="60"
              x2="160"
              y2="40"
              className="animate-pulse"
              style={{ animationDelay: '0.5s' }}
            />
            <line
              x1="90"
              y1="60"
              x2="130"
              y2="90"
              className="animate-pulse"
              style={{ animationDelay: '1s' }}
            />
            <line
              x1="40"
              y1="40"
              x2="70"
              y2="90"
              className="animate-pulse"
              style={{ animationDelay: '1.5s' }}
            />
            <line
              x1="160"
              y1="40"
              x2="130"
              y2="90"
              className="animate-pulse"
              style={{ animationDelay: '2s' }}
            />
          </g>

          {/* Nodes */}
          <g className="fill-primary/60 stroke-primary stroke-2">
            <circle
              cx="40"
              cy="40"
              r="8"
              className="animate-pulse"
              style={{ animationDelay: '0s' }}
            />
            <circle
              cx="90"
              cy="60"
              r="10"
              className="animate-pulse"
              style={{ animationDelay: '0.3s' }}
            />
            <circle
              cx="160"
              cy="40"
              r="8"
              className="animate-pulse"
              style={{ animationDelay: '0.6s' }}
            />
            <circle
              cx="130"
              cy="90"
              r="8"
              className="animate-pulse"
              style={{ animationDelay: '0.9s' }}
            />
            <circle
              cx="70"
              cy="90"
              r="8"
              className="animate-pulse"
              style={{ animationDelay: '1.2s' }}
            />
          </g>

          {/* Floating particles */}
          <g className="fill-primary/20">
            <circle
              cx="20"
              cy="20"
              r="2"
              className="animate-bounce"
              style={{ animationDelay: '0s', animationDuration: '3s' }}
            />
            <circle
              cx="180"
              cy="30"
              r="2"
              className="animate-bounce"
              style={{ animationDelay: '1s', animationDuration: '3s' }}
            />
            <circle
              cx="170"
              cy="100"
              r="2"
              className="animate-bounce"
              style={{ animationDelay: '2s', animationDuration: '3s' }}
            />
            <circle
              cx="30"
              cy="100"
              r="2"
              className="animate-bounce"
              style={{ animationDelay: '1.5s', animationDuration: '3s' }}
            />
          </g>
        </svg>

        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 rounded-full blur-xl scale-150 animate-pulse" />
      </div>

      {/* Content */}
      <div className="text-center space-y-4 max-w-md">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Ready to explore connections?</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your investigation graph will come to life here. Add nodes, discover relationships, and
            uncover hidden patterns in your data.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="flex justify-center gap-6 text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3 h-3" />
            <span>Network mapping</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            <span>Real-time analysis</span>
          </div>
        </div>
      </div>

      {/* Call to action */}
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={handleOpenNewAddItemDialog}
          className="h-10 px-6 font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          size="default"
        >
          <PlusIcon className="w-4 h-4" />
          Add your first item
        </Button>
        <p className="text-xs text-muted-foreground">Add your first node to begin</p>
      </div>
    </div>
  )
})

EmptyState.displayName = 'EmptyState'

export default EmptyState
