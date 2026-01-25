import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { customTypeService, CustomType } from '@/api/custom-type-service'
import { toast } from 'sonner'
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export const Route = createFileRoute('/_auth/dashboard/custom-types/$id')({
  component: CustomTypeEditor
})

interface SchemaField {
  id: string
  key: string
  title: string
  type: string
  format?: string
  description?: string
  required: boolean
}

function CustomTypeEditor() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = id === 'new'

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [fields, setFields] = useState<SchemaField[]>([])
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())

  // Load existing type if editing
  const { data: existingType, isLoading } = useQuery<CustomType>({
    queryKey: ['custom-type', id],
    queryFn: () => customTypeService.getById(id),
    enabled: !isNew
  })

  useEffect(() => {
    if (existingType) {
      setName(existingType.name)
      setDescription(existingType.description || '')
      setStatus(existingType.status === 'archived' ? 'draft' : existingType.status)
      parseSchemaToFields(existingType.schema)
    } else if (isNew) {
      // Start with one empty field
      addField()
    }
  }, [existingType, isNew])

  // Parse JSON Schema to fields array
  const parseSchemaToFields = (schema: any) => {
    const properties = schema.properties || {}
    const required = schema.required || []
    const parsedFields: SchemaField[] = Object.entries(properties).map(
      ([key, value]: [string, any]) => ({
        id: Math.random().toString(36).substr(2, 9),
        key,
        title: value.title || key,
        type: value.type || 'string',
        format: value.format,
        description: value.description,
        required: required.includes(key)
      })
    )
    setFields(parsedFields)
  }

  // Convert fields array to JSON Schema
  const fieldsToSchema = () => {
    const properties: any = {}
    const required: string[] = []

    fields.forEach((field) => {
      if (!field.key.trim()) return // Skip empty keys

      const prop: any = {
        type: field.type,
        title: field.title || field.key
      }
      if (field.description) prop.description = field.description
      if (field.format && field.format !== 'none') prop.format = field.format

      properties[field.key] = prop

      if (field.required) {
        required.push(field.key)
      }
    })

    return {
      title: name || 'MyCustomType',
      type: 'object',
      properties,
      required
    }
  }

  // Add new field
  const addField = () => {
    const newField: SchemaField = {
      id: Math.random().toString(36).substr(2, 9),
      key: '',
      title: '',
      type: 'string',
      required: false
    }
    setFields([...fields, newField])
  }

  // Update field
  const updateField = (id: string, updates: Partial<SchemaField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  // Delete field
  const deleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id))
  }

  // Toggle field expansion
  const toggleFieldExpansion = (fieldId: string) => {
    const newExpanded = new Set(expandedFields)
    if (newExpanded.has(fieldId)) {
      newExpanded.delete(fieldId)
    } else {
      newExpanded.add(fieldId)
    }
    setExpandedFields(newExpanded)
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => customTypeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-types'] })
      toast.success('Custom type created successfully')
      navigate({ to: '/dashboard/custom-types' })
    },
    onError: (error: Error) => {
      toast.error(`Failed to create custom type: ${error.message}`)
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => customTypeService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-types'] })
      queryClient.invalidateQueries({ queryKey: ['custom-type', id] })
      toast.success('Custom type updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update custom type: ${error.message}`)
    }
  })

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the custom type')
      return
    }

    // Check for duplicate or empty keys
    const keys = fields.map((f) => f.key.trim()).filter((k) => k)
    const uniqueKeys = new Set(keys)
    if (keys.length !== uniqueKeys.size) {
      toast.error('Field keys must be unique')
      return
    }

    if (fields.length === 0 || fields.every((f) => !f.key.trim())) {
      toast.error('Please add at least one field')
      return
    }

    const schema = fieldsToSchema()

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      schema,
      status
    }

    if (isNew) {
      createMutation.mutate(data)
    } else {
      updateMutation.mutate(data)
    }
  }

  if (!isNew && isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: '/dashboard/custom-types' })}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="border-l pl-4">
                <h1 className="text-2xl font-bold text-foreground">
                  {isNew ? 'New custom type' : name || 'Edit custom type'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isNew
                    ? 'Define your custom data structure'
                    : 'Update your custom type definition'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {isNew ? 'Create' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-8">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="fields">
              Fields{' '}
              {fields.filter((f) => f.key.trim()).length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {fields.filter((f) => f.key.trim()).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Type details</CardTitle>
                <CardDescription>
                  Configure the basic properties of your custom type
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Contact, Asset, Threat Actor"
                    />
                    <p className="text-xs text-muted-foreground">
                      A descriptive name for this type
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Only published types are available for use
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this custom type represents and how it should be used..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fields Tab */}
          <TabsContent value="fields" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Field Definitions</CardTitle>
                    <CardDescription>Define the properties that make up this type</CardDescription>
                  </div>
                  <Button onClick={addField} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">No fields defined yet</p>
                    <Button onClick={addField} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Field
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <Collapsible
                        key={field.id}
                        open={expandedFields.has(field.id)}
                        onOpenChange={() => toggleFieldExpansion(field.id)}
                      >
                        <div className="border rounded-lg">
                          {/* Collapsed view */}
                          <div className="flex items-center gap-3 p-3">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                {expandedFields.has(field.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>

                            <div className="flex-1 grid grid-cols-5 gap-3 items-center">
                              <Input
                                value={field.key}
                                onChange={(e) => updateField(field.id, { key: e.target.value })}
                                placeholder="field_key"
                                className="h-9"
                              />
                              <Input
                                value={field.title}
                                onChange={(e) => updateField(field.id, { title: e.target.value })}
                                placeholder="Display Name"
                                className="h-9"
                              />
                              <Select
                                value={field.type}
                                onValueChange={(v) => updateField(field.id, { type: v })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="integer">Integer</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="array">Array</SelectItem>
                                  <SelectItem value="object">Object</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select
                                value={field.format || 'none'}
                                onValueChange={(v) =>
                                  updateField(field.id, { format: v === 'none' ? undefined : v })
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="uri">URI</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="date-time">DateTime</SelectItem>
                                  <SelectItem value="ipv4">IPv4</SelectItem>
                                  <SelectItem value="ipv6">IPv6</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={field.required}
                                  onCheckedChange={(checked) =>
                                    updateField(field.id, { required: checked })
                                  }
                                />
                                <span className="text-xs text-muted-foreground">Required</span>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteField(field.id)}
                              className="h-9 w-9 p-0"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>

                          {/* Expanded view with description */}
                          <CollapsibleContent>
                            <div className="px-3 pb-3 pt-0 border-t mt-3">
                              <div className="pt-3 space-y-2">
                                <Label htmlFor={`desc-${field.id}`} className="text-xs">
                                  Description (optional)
                                </Label>
                                <Textarea
                                  id={`desc-${field.id}`}
                                  value={field.description || ''}
                                  onChange={(e) =>
                                    updateField(field.id, { description: e.target.value })
                                  }
                                  placeholder="Describe this field's purpose and expected values..."
                                  rows={3}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}

                    <Button onClick={addField} variant="outline" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      New field
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {fields.length > 0 && (
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Tips for defining fields
                      </p>
                      <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <li>
                          • Field keys should be lowercase with underscores (e.g., email_address)
                        </li>
                        <li>• Display names are shown to users in forms and tables</li>
                        <li>• Use formats to enable validation (e.g., email, date, ipv4)</li>
                        <li>• Mark critical fields as required to ensure data quality</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Schema Preview</CardTitle>
                <CardDescription>JSON Schema representation of your custom type</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(fieldsToSchema(), null, 2)}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Field Summary</CardTitle>
                <CardDescription>Overview of all defined fields</CardDescription>
              </CardHeader>
              <CardContent>
                {fields.filter((f) => f.key.trim()).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fields defined yet</p>
                ) : (
                  <div className="space-y-3">
                    {fields
                      .filter((f) => f.key.trim())
                      .map((field) => (
                        <div
                          key={field.id}
                          className="flex items-start justify-between p-3 border rounded-lg"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {field.title || field.key}
                              </span>
                              {field.required && (
                                <Badge variant="outline" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Key: {field.key}</p>
                            {field.description && (
                              <p className="text-xs text-muted-foreground">{field.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {field.type}
                            </Badge>
                            {field.format && (
                              <Badge variant="outline" className="text-xs">
                                {field.format}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
