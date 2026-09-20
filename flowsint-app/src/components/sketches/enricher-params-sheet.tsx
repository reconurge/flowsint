import { useForm, Controller } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import KeySelector from '@/components/keys/key-select'
import { keyService } from '@/api/key-service'
import type { Key } from '@/types/key'
import type { EnricherParamSchemaItem } from '@/types'

/**
 * A launch the user started but that is waiting on parameter values. Node ids
 * are captured here at click time because the graph selection can change while
 * the sheet is open.
 */
export interface PendingEnricherLaunch {
  enricherName: string
  paramsSchema: EnricherParamSchemaItem[]
  nodeIds: string[]
}

const HTML_INPUT_TYPES = new Set([
  'date',
  'email',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'url'
])

const inputTypeFor = (paramType: string) => (HTML_INPUT_TYPES.has(paramType) ? paramType : 'text')

const isVaultSecret = (param: EnricherParamSchemaItem) => param.type === 'vaultSecret'

export function EnricherParamsSheet({
  pending,
  onOpenChange,
  onSubmit
}: {
  pending: PendingEnricherLaunch | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: Record<string, string>) => void
}) {
  return (
    <Sheet open={pending !== null} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        {pending && (
          <EnricherParamsForm
            key={pending.enricherName}
            enricherName={pending.enricherName}
            paramsSchema={pending.paramsSchema}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function EnricherParamsForm({
  enricherName,
  paramsSchema,
  onSubmit,
  onCancel
}: {
  enricherName: string
  paramsSchema: EnricherParamSchemaItem[]
  onSubmit: (values: Record<string, string>) => void
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<Record<string, string>>({
    defaultValues: Object.fromEntries(paramsSchema.map((p) => [p.name, p.default ?? '']))
  })

  // KeySelector is controlled by a Key object, so a vault-secret field needs
  // the full list to turn the stored id back into one.
  const { data: keys = [] } = useQuery<Key[]>({
    queryKey: ['keys'],
    queryFn: () => keyService.get(),
    enabled: paramsSchema.some(isVaultSecret)
  })

  const renderField = (param: EnricherParamSchemaItem) => {
    const required = param.required ? `${param.name} is required` : false

    if (isVaultSecret(param)) {
      return (
        <Controller
          control={control}
          name={param.name}
          rules={{ required }}
          render={({ field: { onChange, value } }) => (
            <KeySelector
              onChange={(key) => onChange(key.id)}
              value={keys.find((k) => k.id === value)}
            />
          )}
        />
      )
    }

    if (param.type === 'select' && param.options?.length) {
      return (
        <Controller
          control={control}
          name={param.name}
          rules={{ required }}
          render={({ field: { onChange, value, ref } }) => (
            <Select onValueChange={onChange} value={value || ''}>
              <SelectTrigger ref={ref} id={param.name} className="w-full">
                <SelectValue placeholder={`Select ${param.name}`} />
              </SelectTrigger>
              <SelectContent>
                {param.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      )
    }

    return (
      <Input
        id={param.name}
        type={inputTypeFor(param.type)}
        placeholder={param.default ?? param.name}
        className={errors[param.name] ? 'border-destructive' : ''}
        {...register(param.name, { required })}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader>
        <SheetTitle>
          Configure <span className="text-primary">{enricherName}</span>
        </SheetTitle>
        <SheetDescription>Set the parameters for this enricher, then launch it.</SheetDescription>
      </SheetHeader>

      <div className="grow space-y-4 overflow-auto px-4">
        {paramsSchema.map((param) => (
          <div className="space-y-2" key={param.name}>
            <div className="flex flex-col items-start">
              <Label htmlFor={param.name} className="text-sm font-medium">
                {param.name}
                {param.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {param.description && <p className="text-sm opacity-60">{param.description}</p>}
            </div>
            {renderField(param)}
            {errors[param.name] && (
              <p className="text-xs text-destructive">{String(errors[param.name]?.message)}</p>
            )}
          </div>
        ))}
      </div>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Launch enricher</Button>
      </SheetFooter>
    </form>
  )
}
