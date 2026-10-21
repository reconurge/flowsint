import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { orcaRouterService } from '@/api/orcarouter-service'

/**
 * Model selector for the OrcaRouter provider.
 *
 * The options come from the real catalog endpoint, filtered server-side for the
 * entry point that is asking. There is no free-text fallback: a user cannot type
 * a model id that the catalog has not vouched for. When the catalog call fails,
 * the server returns the verified seed marked `degraded` and that state is
 * labelled here rather than silently presented as live data.
 */

export interface OrcaRouterModelSelectorProps {
  /**
   * Which AI entry point is asking. Determines the capability filter the server
   * applies, so a text chat box never offers an image-generation model.
   */
  entryPoint: string
  /**
   * Non-text modalities this entry point will actually upload. Empty for a
   * text-only box. Changing this must recompute the option list.
   */
  requiredModalities?: string[]
  value?: string
  onChange: (modelId: string) => void
  disabled?: boolean
  className?: string
}

export function OrcaRouterModelSelector({
  entryPoint,
  requiredModalities = [],
  value,
  onChange,
  disabled,
  className
}: OrcaRouterModelSelectorProps) {
  const [open, setOpen] = useState(false)

  // Modalities participate in the cache key: an option list filtered for text
  // only is not valid once an image attachment is added, and vice versa.
  const modalityKey = useMemo(() => [...requiredModalities].sort().join(','), [requiredModalities])

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['orcarouter', 'models', entryPoint, modalityKey],
    queryFn: () =>
      orcaRouterService.models(entryPoint, {
        modalities: requiredModalities
      }),
    staleTime: 60_000
  })

  const models = data?.models ?? []
  const selected = models.find((m) => m.id === value)

  // A stored selection that is no longer compatible — because the capability
  // filter changed, or because the catalog dropped the model — is surfaced
  // rather than left in place pointing at something that cannot serve the
  // current request.
  const staleSelection = Boolean(value) && !isLoading && !selected

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="OrcaRouter model"
            disabled={disabled || isLoading}
            className="w-full justify-between font-normal"
            data-testid="orcarouter-model-trigger"
          >
            <span className="truncate">
              {isLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading models…
                </span>
              ) : selected ? (
                selected.name || selected.id
              ) : (
                <span className="text-muted-foreground">Select a model</span>
              )}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search models…" />
            <CommandList>
              {models.length === 0 ? (
                <CommandEmpty>
                  {isError ? 'Could not load models.' : 'No models support this entry point.'}
                </CommandEmpty>
              ) : (
                <CommandGroup heading={`${models.length} models`}>
                  {models.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={model.id}
                      onSelect={() => {
                        onChange(model.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === model.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{model.name || model.id}</span>
                        {model.name && model.name !== model.id ? (
                          <span className="truncate text-xs text-muted-foreground">{model.id}</span>
                        ) : null}
                        {model.inputModalities?.length ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {model.inputModalities.join(' · ')}
                          </span>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {staleSelection ? (
        <p className="text-xs text-destructive" role="alert">
          The selected model no longer supports this request. Pick another.
        </p>
      ) : null}

      {data?.degraded ? (
        <p className="flex items-center gap-1 text-xs text-amber-600" role="status">
          <TriangleAlert className="h-3 w-3" />
          Showing the verified fallback list — live catalog unavailable.
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {data ? `${data.count} models available` : null}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh model list"
        >
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>
    </div>
  )
}

export default OrcaRouterModelSelector
