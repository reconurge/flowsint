import { List, ArrowRightLeft, MapPin } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { NetworkIcon } from '../icons/network'

interface ViewToggleProps {
  view: 'graph' | 'table' | 'relationships' | 'map'
  setView: (view: 'graph' | 'table' | 'relationships' | 'map') => void
}

const views = [
  { value: 'graph', icon: NetworkIcon, label: 'Graph' },
  { value: 'table', icon: List, label: 'Table' },
  { value: 'relationships', icon: ArrowRightLeft, label: 'Relationships' },
  { value: 'map', icon: MapPin, label: 'Map' }
] as const

export function ViewToggle({ view, setView }: ViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(v) => v && setView(v as typeof view)}
    >
      {views.map(({ value, icon: Icon, label }) => (
        <Tooltip key={value}>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value={value}
              aria-label={label}
              className="h-7 w-7 p-0"
            >
              <Icon className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  )
}
