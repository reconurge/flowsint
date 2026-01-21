import { useState, useMemo, memo, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { sketchService } from '@/api/sketch-service'
import { useActionItems } from '@/hooks/use-action-items'
import { toast } from 'sonner'
import { useGraphControls } from '@/stores/graph-controls-store'
import { v4 as uuidv4 } from 'uuid'

interface EntityMapping {
  id: string
  entity_type: string
  include: boolean
  nodeLabel: string
  node_id?: string
  data: Record<string, any>
}

interface ImportPreviewProps {
  analysisResult: any
  sketchId: string
  onSuccess: () => void
  onCancel: () => void
}

const DebouncedInput = memo(
  ({
    value,
    onChange,
    disabled,
    placeholder,
    className,
    debounceMs = 150
  }: {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    placeholder?: string
    className?: string
    debounceMs?: number
  }) => {
    const [localValue, setLocalValue] = useState(value)
    const timeoutRef = useRef<NodeJS.Timeout>(null)

    // Sync from parent when value changes externally
    useEffect(() => {
      setLocalValue(value)
    }, [value])

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setLocalValue(newValue)

        // Clear previous timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        // Debounce the parent update
        timeoutRef.current = setTimeout(() => {
          onChange(newValue)
        }, debounceMs)
      },
      [onChange, debounceMs]
    )

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [])

    return (
      <Input
        className={className}
        value={localValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
      />
    )
  }
)
DebouncedInput.displayName = 'DebouncedInput'

const EntityRow = memo(
  ({
    mapping,
    fields,
    entityTypes,
    isDisabled,
    onIncludeChange,
    onTypeChange,
    onLabelChange,
    onFieldChange
  }: {
    mapping: EntityMapping
    fields: string[]
    entityTypes: string[]
    isDisabled: boolean
    onIncludeChange: (id: string, include: boolean) => void
    onTypeChange: (id: string, type: string) => void
    onLabelChange: (id: string, label: string) => void
    onFieldChange: (id: string, field: string, value: string) => void
  }) => {
    // Create stable callbacks for this specific row
    const handleInclude = useCallback(
      (checked: boolean) => {
        onIncludeChange(mapping.id, checked)
      },
      [mapping.id, onIncludeChange]
    )

    const handleType = useCallback(
      (value: string) => {
        onTypeChange(mapping.id, value)
      },
      [mapping.id, onTypeChange]
    )

    const handleLabel = useCallback(
      (value: string) => {
        onLabelChange(mapping.id, value)
      },
      [mapping.id, onLabelChange]
    )

    return (
      <div className={`flex border-b ${!mapping.include ? 'opacity-50' : ''}`}>
        <div className="px-3 py-2 border-r w-[60px] shrink-0 flex items-center">
          <Checkbox checked={mapping.include} onCheckedChange={handleInclude} />
        </div>
        <div className="px-3 py-2 border-r w-40 shrink-0">
          <Select
            value={mapping.entity_type}
            onValueChange={handleType}
            disabled={!mapping.include || isDisabled}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="px-3 py-2 border-r w-[200px] shrink-0">
          <DebouncedInput
            className="h-8 w-full text-xs"
            value={mapping.nodeLabel}
            onChange={handleLabel}
            disabled={!mapping.include}
            placeholder="Label..."
          />
        </div>
        {fields.map((field) => (
          <div key={field} className="px-3 py-2 border-r w-[200px] shrink-0">
            <DebouncedInput
              className="h-8 w-full text-xs"
              value={mapping.data[field] || ''}
              onChange={(value) => onFieldChange(mapping.id, field, value)}
              disabled={!mapping.include}
              placeholder="-"
            />
          </div>
        ))}
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison for better memoization
    return (
      prevProps.mapping === nextProps.mapping &&
      prevProps.fields === nextProps.fields &&
      prevProps.entityTypes === nextProps.entityTypes &&
      prevProps.isDisabled === nextProps.isDisabled
    )
  }
)
EntityRow.displayName = 'EntityRow'

interface TypeTableProps {
  mappings: EntityMapping[]
  fields: string[]
  entityTypes: string[]
  isDisabled: boolean
  currentPage: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (count: number) => void
  onIncludeChange: (id: string, include: boolean) => void
  onTypeChange: (id: string, type: string) => void
  onLabelChange: (id: string, label: string) => void
  onFieldChange: (id: string, field: string, value: string) => void
}

const SimpleTypeTable = memo(
  ({
    mappings,
    fields,
    entityTypes,
    isDisabled,
    currentPage,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    onIncludeChange,
    onTypeChange,
    onLabelChange,
    onFieldChange
  }: TypeTableProps) => {
    const totalPages = Math.ceil(mappings.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage

    const paginatedMappings = useMemo(
      () => mappings.slice(startIndex, endIndex),
      [mappings, startIndex, endIndex]
    )

    const handleItemsPerPageChange = useCallback(
      (value: string) => {
        onItemsPerPageChange(Number(value))
      },
      [onItemsPerPageChange]
    )

    const handlePrevPage = useCallback(() => {
      onPageChange(currentPage - 1)
    }, [currentPage, onPageChange])

    const handleNextPage = useCallback(() => {
      onPageChange(currentPage + 1)
    }, [currentPage, onPageChange])

    const totalWidth = 60 + 160 + 200 + fields.length * 200

    return (
      <div className="h-full flex flex-col">
        <div className="border rounded-lg overflow-auto flex-1 min-h-0">
          <div style={{ minWidth: totalWidth }}>
            {/* Sticky header */}
            <div className="flex bg-muted sticky top-0 z-10 border-b">
              <div className="px-3 py-2 text-left text-xs font-medium border-r w-[60px] shrink-0">
                Include
              </div>
              <div className="px-3 py-2 text-left text-xs font-medium border-r w-[160px] shrink-0">
                Type
              </div>
              <div className="px-3 py-2 text-left text-xs font-medium border-r w-[200px] shrink-0">
                Label
              </div>
              {fields.map((field) => (
                <div
                  key={field}
                  className="px-3 py-2 text-left text-xs font-medium border-r w-[200px] shrink-0"
                >
                  {field}
                </div>
              ))}
            </div>

            {/* Simple body - no virtualization */}
            <div>
              {paginatedMappings.map((mapping) => (
                <EntityRow
                  key={mapping.id}
                  mapping={mapping}
                  fields={fields}
                  entityTypes={entityTypes}
                  isDisabled={isDisabled}
                  onIncludeChange={onIncludeChange}
                  onTypeChange={onTypeChange}
                  onLabelChange={onLabelChange}
                  onFieldChange={onFieldChange}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between pt-3 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page:</span>
            <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              {startIndex + 1}-{Math.min(endIndex, mappings.length)} of {mappings.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
)
SimpleTypeTable.displayName = 'SimpleTypeTable'

export function ImportPreview({
  analysisResult,
  sketchId,
  onSuccess,
  onCancel
}: ImportPreviewProps) {
  const { actionItems, isLoading: isLoadingActionItems } = useActionItems()
  const refetchGraph = useGraphControls((s) => s.refetchGraph)
  const regenerateLayout = useGraphControls((s) => s.regenerateLayout)
  const currentLayoutType = useGraphControls((s) => s.currentLayoutType)

  const fieldsByType = useMemo(() => {
    if (!actionItems) return {}
    const fields: Record<string, string[]> = {}

    actionItems.forEach((item) => {
      if (item.children) {
        item.children.forEach((child) => {
          fields[child.label] = child.fields
            .filter((f: any) => f.name !== 'label')
            .map((f: any) => f.name)
        })
      } else if (item.fields) {
        fields[item.label] = item.fields
          .filter((f: any) => f.name !== 'label')
          .map((f: any) => f.name)
      }
    })

    return fields
  }, [actionItems])

  const [mappingsById, setMappingsById] = useState<Map<string, EntityMapping>>(new Map())
  const edges = analysisResult.edges
  const [mappingIdsByType, setMappingIdsByType] = useState<Record<string, string[]>>({})
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!actionItems || isInitialized) return

    const newMappingsById = new Map<string, EntityMapping>()
    const newMappingIdsByType: Record<string, string[]> = {}

    Object.entries(analysisResult.entities).forEach(([typeName, group]: [string, any]) => {
      const typeFields = fieldsByType[typeName] || []
      const ids: string[] = []

      group.results.forEach((entity: any) => {
        const data: Record<string, any> = {}
        typeFields.forEach((field) => {
          data[field] = entity.obj[field] ?? ''
        })
        data.nodeLabel = entity.obj.nodeLabel

        const id = uuidv4()
        ids.push(id)

        newMappingsById.set(id, {
          id,
          entity_type: entity.detected_type,
          include: true,
          nodeLabel: entity.obj.nodeLabel,
          node_id: entity?.node_id?.toString(),
          data
        })
      })

      newMappingIdsByType[typeName] = ids
    })

    setMappingsById(newMappingsById)
    setMappingIdsByType(newMappingIdsByType)
    setIsInitialized(true)
  }, [actionItems, analysisResult.entities, fieldsByType, isInitialized])

  const [paginationByType, setPaginationByType] = useState<
    Record<string, { page: number; perPage: number }>
  >({})

  const getPagination = useCallback(
    (typeName: string) => {
      return paginationByType[typeName] || { page: 1, perPage: 20 }
    },
    [paginationByType]
  )

  const setPageForType = useCallback(
    (typeName: string, page: number) => {
      setPaginationByType((prev) => ({
        ...prev,
        [typeName]: { ...getPagination(typeName), page }
      }))
    },
    [getPagination]
  )

  const setPerPageForType = useCallback((typeName: string, perPage: number) => {
    setPaginationByType((prev) => ({
      ...prev,
      [typeName]: { page: 1, perPage } // Reset to page 1 when changing items per page
    }))
  }, [])

  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  const entityTypes = useMemo(() => {
    if (!actionItems) return []
    const types: string[] = []
    actionItems.forEach((item) => {
      if (item.children) {
        item.children.forEach((c: any) => c.label && types.push(c.label))
      } else if (item.label) {
        types.push(item.label)
      }
    })
    return [...new Set(types)]
  }, [actionItems])

  const handleIncludeChange = useCallback((id: string, include: boolean) => {
    setMappingsById((prev) => {
      const mapping = prev.get(id)
      if (!mapping) return prev
      const newMap = new Map(prev)
      newMap.set(id, { ...mapping, include })
      return newMap
    })
  }, [])

  const handleTypeChange = useCallback(
    (id: string, newType: string) => {
      setMappingsById((prev) => {
        const mapping = prev.get(id)
        if (!mapping || mapping.entity_type === newType) return prev

        const newFields = fieldsByType[newType] || []
        const newData: Record<string, any> = {}
        newFields.forEach((field) => {
          newData[field] = mapping.data[field] ?? ''
        })
        newData.nodeLabel = mapping.nodeLabel

        const newMap = new Map(prev)
        newMap.set(id, { ...mapping, entity_type: newType, data: newData })
        return newMap
      })
    },
    [fieldsByType]
  )

  const handleLabelChange = useCallback((id: string, label: string) => {
    setMappingsById((prev) => {
      const mapping = prev.get(id)
      if (!mapping) return prev
      const newMap = new Map(prev)
      newMap.set(id, { ...mapping, nodeLabel: label })
      return newMap
    })
  }, [])

  const handleFieldChange = useCallback((id: string, field: string, value: string) => {
    setMappingsById((prev) => {
      const mapping = prev.get(id)
      if (!mapping) return prev
      const newMap = new Map(prev)
      newMap.set(id, {
        ...mapping,
        data: { ...mapping.data, [field]: value }
      })
      return newMap
    })
  }, [])

  const getMappingsForType = useCallback(
    (typeName: string): EntityMapping[] => {
      const ids = mappingIdsByType[typeName] || []
      return ids.map((id) => mappingsById.get(id)!).filter(Boolean)
    },
    [mappingIdsByType, mappingsById]
  )

  // Pre-compute mappings for all types to ensure stable references
  const mappingsByType = useMemo(() => {
    const result: Record<string, EntityMapping[]> = {}
    Object.keys(mappingIdsByType).forEach((typeName) => {
      result[typeName] = getMappingsForType(typeName)
    })
    return result
  }, [mappingIdsByType, getMappingsForType])

  const handleImport = useCallback(async () => {
    setIsImporting(true)
    try {
      const mappingsArray = Array.from(mappingsById.values()).filter((m) => m.include)
      const result = await sketchService.executeImport(sketchId, mappingsArray, edges)
      setImportResult(result)

      if (result.status === 'completed') {
        setTimeout(onSuccess, 2000)
        refetchGraph()
        setIsImporting(false)
        toast(`Import successful !`, {
          duration: 6000,
          description: `${result.nodes_created} entities were imported. You can now display them with the layout commands.`,
          action: {
            label: 'Beautify layout',
            onClick: () => regenerateLayout(currentLayoutType)
          }
        })
      }
    } catch (error) {
      setIsImporting(false)
      toast.error(error?.message)
    }
  }, [mappingsById, sketchId, onSuccess, refetchGraph])

  const typeNames = useMemo(() => Object.keys(mappingIdsByType), [mappingIdsByType])
  const [activeTab, setActiveTab] = useState('')

  // Set initial active tab when types are loaded
  useEffect(() => {
    if (typeNames.length > 0 && !activeTab) {
      setActiveTab(typeNames[0])
    }
  }, [typeNames, activeTab])

  const includedCount = useMemo(() => {
    let count = 0
    mappingsById.forEach((m) => {
      if (m.include) count++
    })
    return count
  }, [mappingsById])

  const getFieldsForType = useCallback(
    (typeName: string): string[] => {
      return fieldsByType[typeName] || []
    },
    [fieldsByType]
  )

  const fieldsPerType = useMemo(() => {
    const result: Record<string, string[]> = {}
    typeNames.forEach((name) => {
      result[name] = getFieldsForType(name)
    })
    return result
  }, [typeNames, getFieldsForType])

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (importResult) {
    return (
      <div className="py-6">
        <div className="flex flex-col items-center gap-4">
          {importResult.status === 'completed' ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Import Successful!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {importResult.nodes_created} entities created
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-orange-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Import Completed with Errors</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {importResult.nodes_created} created, {importResult.errors.length} errors
                </p>
              </div>
              {importResult.errors.length > 0 && (
                <div className="w-full mt-4">
                  <Label>Errors:</Label>
                  <div className="h-32 w-full rounded-md border p-2 mt-2 overflow-auto">
                    {importResult.errors.map((error: string, idx: number) => (
                      <p key={idx} className="text-xs text-red-500 mb-1">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <Button onClick={onSuccess} className="mt-4">
            Close
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="px-4 pt-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            {typeNames.map((name) => (
              <TabsTrigger key={name} value={name} className="flex-1">
                {name} ({mappingsByType[name]?.length || 0})
              </TabsTrigger>
            ))}
            <TabsTrigger key={'edges'} value={'edges'} className="flex-1">
              Edges ({edges.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden px-4 py-4">
          {typeNames.map((name) => {
            const pagination = getPagination(name)
            return (
              <TabsContent
                key={name}
                value={name}
                className="h-full mt-0"
                forceMount // FIX 11: Keep mounted to preserve scroll position
                hidden={activeTab !== name}
              >
                <SimpleTypeTable
                  mappings={mappingsByType[name]}
                  fields={fieldsPerType[name]}
                  entityTypes={entityTypes}
                  isDisabled={isLoadingActionItems}
                  currentPage={pagination.page}
                  itemsPerPage={pagination.perPage}
                  onPageChange={(page) => setPageForType(name, page)}
                  onItemsPerPageChange={(perPage) => setPerPageForType(name, perPage)}
                  onIncludeChange={handleIncludeChange}
                  onTypeChange={handleTypeChange}
                  onLabelChange={handleLabelChange}
                  onFieldChange={handleFieldChange}
                />
              </TabsContent>
            )
          })}
          <TabsContent
            key={'edges'}
            value={'edges'}
            className="h-full mt-0 overflow-auto"
            forceMount
            hidden={activeTab !== 'edges'}
          >
            <EdgesPanel edges={edges} />
          </TabsContent>
        </div>
      </Tabs>

      <div className="flex justify-end gap-2 px-4 py-3 border-t shrink-0 bg-background">
        <Button variant="outline" onClick={onCancel} disabled={isImporting}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={isImporting}>
          {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isImporting ? 'Importing...' : `Import ${includedCount} entities`}
        </Button>
      </div>
    </div>
  )
}

type PreviewEdge = {
  from_id: string
  to_id: string
  from_obj: { label: string }
  to_obj: { label: string }
  label: string
}
type EdgesPanelProps = {
  edges: PreviewEdge[]
}
const EdgesPanel = ({ edges }: EdgesPanelProps) => {
  return (
    <div>
      {edges.map((edge) => (
        <div>
          <Badge variant="outline">{edge.from_obj.label}</Badge> - {edge.label} -{' '}
          <Badge variant="outline">{edge.to_obj.label}</Badge>
        </div>
      ))}
    </div>
  )
}
