import { List, ArrowRightLeft, MapPin } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { NetworkIcon } from '../icons/network'
import { useTranslation } from 'react-i18next'

interface ViewToggleProps {
  view: 'graph' | 'table' | 'relationships' | 'map'
  setView: (view: 'graph' | 'table' | 'relationships' | 'map') => void
}

const getViews = (t: any) => [
  { value: 'graph', icon: NetworkIcon, label: t('sketches.views.graph', { defaultValue: 'Graph' }) },
  { value: 'table', icon: List, label: t('sketches.views.table', { defaultValue: 'Table' }) },
  { value: 'relationships', icon: ArrowRightLeft, label: t('sketches.views.relationships', { defaultValue: 'Relationships' }) },
  { value: 'map', icon: MapPin, label: t('sketches.views.map', { defaultValue: 'Map' }) }
] as const

export function ViewToggle({ view, setView }: ViewToggleProps) {
  const { t } = useTranslation()
  const views = getViews(t)

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
