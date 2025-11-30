import { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarIcon, Loader2, InfoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import type { FormField } from '@/lib/action-items'
import { MetadataField } from '@/components/sketches/metadata-field'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

interface DynamicFormProps {
  currentNodeType: any
  initialData?: Record<string, any>
  onSubmit?: (data: any) => void
  isForm?: boolean
  loading?: boolean
}

export function DynamicForm({
  currentNodeType,
  initialData = {},
  onSubmit,
  isForm = true,
  loading = false
}: DynamicFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const dynamicSchema = useMemo(() => {
    const createDynamicSchema = () => {
      const schemaMap: Record<string, z.ZodType<any>> = {}
      if (!currentNodeType) return z.object(schemaMap)
      currentNodeType.fields.forEach((field: any) => {
        switch (field.type) {
          case 'email':
            schemaMap[field.name] = field.required
              ? z
                  .string()
                  .min(1, { message: `${field.label} is required` })
                  .email({ message: 'Email invalide' })
              : z.string().email({ message: 'Email invalide' }).optional()
            break
          case 'url':
            schemaMap[field.name] = field.required
              ? z
                  .string()
                  .min(1, { message: `${field.label} is required` })
                  .url({ message: 'URL invalide' })
              : z.string().url({ message: 'URL invalide' }).optional()
            break
          case 'number':
            schemaMap[field.name] = field.required
              ? z
                  .string()
                  .min(1, { message: `${field.label} is required` })
                  .refine((val) => !isNaN(Number(val)), {
                    message: 'Doit être un nombre valide'
                  })
              : z
                  .string()
                  .refine((val) => val === '' || !isNaN(Number(val)), {
                    message: 'Doit être un nombre valide'
                  })
                  .optional()
            break
          case 'select':
            if (field.options && field.options.length > 0) {
              const validValues = field.options.map((option: any) => option.value)
              schemaMap[field.name] = field.required
                ? z
                    .string()
                    .min(1, { message: `${field.label} is required` })
                    .refine((val) => validValues.includes(val), {
                      message: 'Valeur non valide'
                    })
                : z
                    .string()
                    .refine((val) => val === '' || validValues.includes(val), {
                      message: 'Valeur non valide'
                    })
                    .optional()
            } else {
              schemaMap[field.name] = field.required
                ? z.string().min(1, { message: `${field.label} is required` })
                : z.string().optional()
            }
            break
          case 'date':
            schemaMap[field.name] = field.required
              ? z.string().min(1, { message: `${field.label} is required` })
              : z.string().optional()
            break
          case 'hidden':
            schemaMap[field.name] = z.string()
            break
          case 'textarea':
            schemaMap[field.name] = field.required
              ? z.string().min(1, { message: `${field.label} is required` })
              : z.string().optional()
            break
          case 'metadata':
            schemaMap[field.name] = field.required
              ? z.record(z.string(), z.string()).refine((val) => Object.keys(val).length > 0, {
                  message: 'Au moins une métadonnée is requirede'
                })
              : z.record(z.string(), z.string()).optional()
            break
          default:
            schemaMap[field.name] = field.required
              ? z.string().min(1, { message: `${field.label} is required` })
              : z.string().optional()
        }
      })
      return z.object(schemaMap)
    }
    return createDynamicSchema()
  }, [currentNodeType])

  type FormValues = z.infer<typeof dynamicSchema>
  const getDefaultValues = () => {
    const defaults: Record<string, any> = {}

    if (!currentNodeType) return defaults

    currentNodeType.fields.forEach((field: any) => {
      // Si nous avons des données initiales pour ce champ, les utiliser
      if (initialData && initialData[field.name] !== undefined) {
        defaults[field.name] = initialData[field.name]
      }
      // Sinon, gérer les différents types de champs
      else if (field.type === 'hidden') {
        const fieldKey = currentNodeType.key
        const match = fieldKey.match(/_([^_]+)$/)
        if ((match && match[1] && field.name === 'platform') || field.name === 'type') {
          defaults[field.name] = match?.[1]
        } else {
          defaults[field.name] = ''
        }
      } else if (field.type === 'select') {
        // Pour les champs select, vérifier s'il y a des options
        if (field.options && field.options.length > 0) {
          // Si requis, utilisez la première option comme valeur par défaut
          // Sinon, utilisez une chaîne vide car un champ facultatif peut être vide
          defaults[field.name] =
            field.required && field.options.length > 0 ? field.options[0].value : ''
        } else {
          defaults[field.name] = ''
        }
      } else if (field.type === 'date') {
        // Pour les champs de date, nous laissons une chaîne vide
        // mais nous nous assurerons plus tard que les manipulations de dates sont robustes
        defaults[field.name] = ''
      } else if (field.type === 'metadata') {
        defaults[field.name] = {}
      } else {
        defaults[field.name] = ''
      }
    })

    return defaults
  }

  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: getDefaultValues()
  })

  const handleFormSubmit = async (data: FormValues) => {
    if (!isForm) return
    try {
      setIsSubmitting(true)
      if (onSubmit) {
        await onSubmit(data)
      }
    } catch (error) {
      console.log(error)
      toast.error('An error occurred while submitting the form.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderField = (field: FormField) => {
    if (field.type === 'hidden') {
      return <input key={field.name} type="hidden" {...register(field.name)} />
    }
    const FieldDescription = field.description ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <InfoIcon className="h-4 w-4 text-muted-foreground ml-1 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{field.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : null

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <div className="space-y-2" key={field.name}>
            <div className="flex items-center">
              <Label htmlFor={field.name} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {FieldDescription}
            </div>
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              className={errors[field.name] ? 'border-destructive' : ''}
              {...register(field.name)}
            />
            {errors[field.name] && (
              <p className="text-xs text-destructive">{String(errors[field.name]?.message)}</p>
            )}
          </div>
        )

      case 'textarea':
        return (
          <div className="space-y-2" key={field.name}>
            <div className="flex items-center">
              <Label htmlFor={field.name} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {FieldDescription}
            </div>
            <Textarea
              id={field.name}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              className={errors[field.name] ? 'border-destructive' : ''}
              {...register(field.name)}
            />
            {errors[field.name] && (
              <p className="text-xs text-destructive">{String(errors[field.name]?.message)}</p>
            )}
          </div>
        )

      case 'select':
        return (
          <div className="space-y-2" key={field.name}>
            <div className="flex items-center">
              <Label htmlFor={field.name} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {FieldDescription}
            </div>
            <Controller
              control={control}
              name={field.name}
              render={({ field: { onChange, value, ref } }) => (
                <Select onValueChange={onChange} value={value || ''} defaultValue={value || ''}>
                  <SelectTrigger
                    ref={ref}
                    id={field.name}
                    className={errors[field.name] ? 'border-destructive' : ''}
                  >
                    <SelectValue
                      placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {!field.required && <SelectItem value=" ">-- Sélectionner --</SelectItem>}
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors[field.name] && (
              <p className="text-xs text-destructive">{String(errors[field.name]?.message)}</p>
            )}
          </div>
        )

      case 'date':
        return (
          <div className="space-y-2" key={field.name}>
            <div className="flex items-center">
              <Label htmlFor={field.name} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {FieldDescription}
            </div>
            <Controller
              control={control}
              name={field.name}
              render={({ field: { onChange, value, ref } }) => {
                // Sécurisation des valeurs de date
                const dateValue = value
                  ? typeof value === 'string' && value.trim() !== ''
                    ? new Date(value)
                    : null
                  : null

                // Validation pour éviter les dates invalides
                const isValidDate = dateValue instanceof Date && !isNaN(dateValue.getTime())

                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <div>
                        <Button
                          ref={ref}
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !isValidDate && 'text-muted-foreground',
                            errors[field.name] && 'border-destructive'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {isValidDate
                            ? format(dateValue as Date, 'PPP', { locale: fr })
                            : field.placeholder || `Sélectionner une date`}
                        </Button>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={isValidDate ? (dateValue as Date) : undefined}
                        onSelect={(date) => {
                          // Assurer une bonne conversion vers ISO string
                          onChange(date ? date.toISOString() : '')
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )
              }}
            />
            {errors[field.name] && (
              <p className="text-xs text-destructive">{String(errors[field.name]?.message)}</p>
            )}
          </div>
        )

      case 'url':
        return (
          <div className="space-y-2" key={field.name}>
            <div className="flex items-center">
              <Label htmlFor={field.name} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {FieldDescription}
            </div>
            <Input
              id={field.name}
              type="url"
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              className={errors[field.name] ? 'border-destructive' : ''}
              {...register(field.name)}
            />
            {errors[field.name] && (
              <p className="text-xs text-destructive">{String(errors[field.name]?.message)}</p>
            )}
          </div>
        )

      case 'metadata':
        return (
          <div className="space-y-2" key={field.name}>
            <div className="flex items-center">
              <Label htmlFor={field.name} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {FieldDescription}
            </div>
            <Controller
              control={control}
              name={field.name}
              render={({ field: { onChange, value } }) => (
                <MetadataField
                  value={value || {}}
                  onChange={onChange}
                  error={errors[field.name]?.message as string}
                  className="border rounded-md p-3 bg-muted/30"
                />
              )}
            />
          </div>
        )
      default:
        return null
    }
  }

  if (!currentNodeType) {
    return <div className="p-4 text-center text-muted-foreground">Could not find this item.</div>
  }
  if (!isForm) {
    return <div className="space-y-4">{currentNodeType.fields.map(renderField)}</div>
  }
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 p-1">
      <div className="space-y-4">{currentNodeType.fields.map(renderField)}</div>
      <div className="flex sticky translate-y-1 p-1 bottom-0 bg-background items-center justify-end space-x-2">
        <Button type="submit" disabled={isSubmitting || loading}>
          {isSubmitting || loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            `Add ${currentNodeType.label}`
          )}
        </Button>
      </div>
    </form>
  )
}
