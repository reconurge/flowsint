import * as LucideIcons from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { SchemaField } from './field-row'

interface TypePreviewProps {
  name: string
  description: string
  icon: string
  color: string
  fields: SchemaField[]
  status: 'draft' | 'published'
}

export function TypePreview({ name, description, icon, color, fields, status }: TypePreviewProps) {
  const Icon = (LucideIcons as any)[icon] || LucideIcons.FileQuestion
  const validFields = fields.filter((f) => f.key.trim())

  return (
    <div className="space-y-6">
      {/* Entity card preview */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3">Entity card</p>
        <div className="border border-border/60 rounded-xl p-5 bg-card max-w-sm">
          <div className="flex items-start gap-3.5">
            <div
              className="rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: color, width: 44, height: 44 }}
            >
              <Icon className="text-white" size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm truncate">{name || 'Untitled type'}</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {description || 'No description'}
              </p>
            </div>
          </div>

          {validFields.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
              {validFields.slice(0, 4).map((field) => (
                <div key={field.id} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{field.title || field.key}</span>
                  <span className="text-xs text-muted-foreground/60 font-mono">
                    {field.type}
                    {field.format && field.format !== 'none' ? `:${field.format}` : ''}
                  </span>
                </div>
              ))}
              {validFields.length > 4 && (
                <p className="text-[10px] text-muted-foreground/50">
                  +{validFields.length - 4} more fields
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Graph node preview */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3">Graph node</p>
        <div className="flex items-center gap-3 p-4 border border-border/60 rounded-xl bg-card max-w-[200px]">
          <div
            className="rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: color, width: 36, height: 36 }}
          >
            <Icon className="text-white" size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{name || 'Untitled'}</p>
            <p className="text-[10px] text-muted-foreground">
              {validFields.length} field{validFields.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Schema preview */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3">JSON Schema</p>
        <pre className="p-4 bg-muted/50 rounded-lg text-xs font-mono overflow-x-auto text-muted-foreground leading-relaxed">
          {JSON.stringify(buildSchema(name, fields), null, 2)}
        </pre>
      </div>
    </div>
  )
}

function buildSchema(name: string, fields: SchemaField[]) {
  const properties: Record<string, any> = {}
  const required: string[] = []

  fields.forEach((field) => {
    if (!field.key.trim()) return
    const prop: any = { type: field.type, title: field.title || field.key }
    if (field.description) prop.description = field.description
    if (field.format && field.format !== 'none') prop.format = field.format
    properties[field.key] = prop
    if (field.required) required.push(field.key)
  })

  return {
    title: name || 'MyCustomType',
    type: 'object',
    properties,
    required
  }
}
