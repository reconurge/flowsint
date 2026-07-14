import type React from 'react'
import { memo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Info, GripVertical, TriangleAlert } from 'lucide-react'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import { Badge } from '../ui/badge'
import { type EnricherItemProps } from '@/types/enricher'
import { useIcon } from '@/hooks/use-icon'
import { useTranslation } from 'react-i18next'

// Custom equality function for EnricherItem
function areEqual(prevProps: EnricherItemProps, nextProps: EnricherItemProps) {
  return (
    prevProps.enricher.class_name === nextProps.enricher.class_name &&
    prevProps.enricher.name === nextProps.enricher.name &&
    prevProps.enricher.module === nextProps.enricher.module &&
    prevProps.enricher.documentation === nextProps.enricher.documentation &&
    prevProps.enricher.description === nextProps.enricher.description &&
    prevProps.category === nextProps.category
  )
}

// Memoized enricher item component for the sidebar
const EnricherItem = memo(({ enricher, category }: EnricherItemProps) => {
  const colors = useNodesDisplaySettings((s) => s.colors)
  const borderInputColor = colors[enricher.inputs.type.toLowerCase()]
  const borderOutputColor = colors[enricher.outputs.type.toLowerCase()]
  const Icon =
    enricher.type === 'type'
      ? useIcon(enricher.outputs.type.toLowerCase() as string)
      : enricher.icon
        ? useIcon(enricher.icon)
        : null

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { t } = useTranslation()

  const isType = enricher.type === 'type'
  const typeKey = enricher.outputs?.type?.toLowerCase() || ''
  
  const displayName = isType 
    ? t('types.' + typeKey + '.name', { defaultValue: enricher.class_name }) 
    : t('enrichers.' + enricher.class_name + '.name', { defaultValue: enricher.class_name })

  const displayDesc = isType
    ? t('types.' + typeKey + '.description', { defaultValue: enricher.description })
    : t('enrichers.' + enricher.class_name + '.description', { defaultValue: enricher.description })

  const tInputProps = t('flows.editor.enricherItem.inputProperties', { defaultValue: 'Input Properties' })
  const tOutputProps = t('flows.editor.enricherItem.outputProperties', { defaultValue: 'Output Properties' })
  const tModule = t('flows.editor.enricherItem.module', { defaultValue: 'Module' })
  const tDescription = t('flows.editor.enricherItem.description', { defaultValue: 'Description' })
  const tInput = t('flows.editor.enricherItem.input', { defaultValue: 'Input:' })
  const tOutput = t('flows.editor.enricherItem.output', { defaultValue: 'Output:' })
  const tConfigRequired = t('flows.editor.enricherItem.configRequired', { defaultValue: 'Configuration required' })
  const tNoDescription = t('customTypes.noDescription', { defaultValue: 'No description available' })

  // Handler for drag start - using useCallback to prevent recreation on each render
  const onDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const data = { ...enricher, category }
      event.dataTransfer.setData('application/json', JSON.stringify(data))
      event.dataTransfer.effectAllowed = 'move'
    },
    [enricher, category]
  )

  const isConfigurationRequired = enricher.required_params

  return (
    <TooltipProvider>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div
          draggable
          onDragStart={onDragStart}
          className="p-3 rounded-md relative w-full overflow-hidden cursor-grab bg-card border hover:shadow-md transition-all group"
          style={{
            borderLeftWidth: '5px',
            borderRightWidth: '5px',
            borderLeftColor: borderInputColor ?? borderOutputColor,
            borderRightColor: borderOutputColor,
            cursor: 'grab'
          }}
        >
          <div className="flex justify-between grow items-start">
            <div className="flex items-start gap-2 grow truncate text-ellipsis">
              <div>
                <GripVertical className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </div>
              <div className="space-y-1 truncate">
                <div className="flex items-center gap-2 truncate text-ellipsis">
                  {Icon && <Icon size={24} />}
                  <h3 className="text-sm font-medium truncate text-ellipsis">
                    {displayName}
                  </h3>
                </div>
                <p className="text-xs font-normal truncate text-ellipsis opacity-60">
                  {displayDesc}
                </p>
                {enricher.type !== 'type' && (
                  <div className="mt-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{tInput}</span>
                      <span className="text-muted-foreground truncate text-ellipsis">
                        {t('types.' + enricher.inputs.type.toLowerCase() + '.name', { defaultValue: enricher.inputs.type })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{tOutput}</span>
                      <span className="text-muted-foreground truncate text-ellipsis">
                        {t('types.' + enricher.outputs.type.toLowerCase() + '.name', { defaultValue: enricher.outputs.type })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-4 w-4 opacity-60" strokeWidth={1.5} />
                </Button>
              </DialogTrigger>
            </div>
          </div>
          {isConfigurationRequired && (
            <div className="absolute bottom-3 right-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TriangleAlert className="h-4 w-4 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tConfigRequired}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
        <DialogContent className="sm:max-w-[725px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: borderInputColor }} />
              {displayName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {isConfigurationRequired && (
              <div>
                <Badge variant={'outline'} className=" top-3 right-3">
                  {tConfigRequired} <TriangleAlert className="h-4 w-4 text-orange-500" />
                </Badge>
              </div>
            )}
            <div className="space-y-2">
              <h4 className="font-medium text-sm" style={{ color: borderInputColor }}>
                {tDescription}
              </h4>
              <p className="text-sm text-muted-foreground">
                {displayDesc || tNoDescription}
              </p>
            </div>
            {enricher.module && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm" style={{ color: borderInputColor }}>
                  {tModule}
                </h4>
                <p className="text-sm text-muted-foreground">{enricher.module}</p>
              </div>
            )}
            <div className="space-y-2">
              <h4 className="font-medium text-sm" style={{ color: borderInputColor }}>
                {tInputProps}
              </h4>
              <div className="space-y-1">
                {enricher?.inputs?.properties?.map((prop, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{t('types.' + enricher.inputs.type.toLowerCase() + '.fields.' + prop.name, { defaultValue: prop.name })}:</span>{' '}
                    <span className="text-muted-foreground">{prop.type}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm" style={{ color: borderOutputColor }}>
                {tOutputProps}
              </h4>
              <div className="space-y-1">
                {enricher?.outputs?.properties?.map((prop, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{t('types.' + enricher.outputs.type.toLowerCase() + '.fields.' + prop.name, { defaultValue: prop.name })}:</span>{' '}
                    <span className="text-muted-foreground">{prop.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}, areEqual)

EnricherItem.displayName = 'EnricherItem'

export default EnricherItem
