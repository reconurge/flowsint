import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { sketchService } from '@/api/sketch-service'
import { useActionItems } from '@/hooks/use-action-items'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import { useGraphControls } from '@/stores/graph-controls-store'

interface EntityPreview {
  row_index: number
  data: Record<string, any>
  detected_type: string
  primary_value: string
}

interface AnalysisResult {
  entities: EntityPreview[]
  total_entities: number
  type_distribution: Record<string, number>
  columns: string[]
}

interface EntityMapping {
  row_index: number
  entity_type: string
  include: boolean
  label: string
  data: Record<string, any>
}

interface ImportPreviewProps {
  analysisResult: AnalysisResult
  file: File
  sketchId: string
  onSuccess: () => void
  onCancel: () => void
}

// Removed fixed ENTITY_TYPES; now derived from useActionItems()

type TableRow = EntityPreview & {
  mapping: EntityMapping
}

export function ImportPreview({
  analysisResult,
  file,
  sketchId,
  onSuccess,
  onCancel
}: ImportPreviewProps) {
  const { actionItems, isLoading: isLoadingActionItems } = useActionItems()
  const refetchGraph = useGraphControls((s) => s.refetchGraph)
  const [entityMappings, setEntityMappings] = useState<EntityMapping[]>(() => {
    // Initialize entity mappings from detected entities
    return analysisResult.entities.map((entity) => ({
      row_index: entity.row_index,
      entity_type: entity.detected_type,
      include: true,
      label: entity.primary_value,
      data: { ...entity.data }
    }))
  })

  // Get all unique column keys across all entities
  const allDataKeys = useMemo(() => {
    const keysSet = new Set<string>()
    analysisResult.entities.forEach(entity => {
      Object.keys(entity.data).forEach(key => keysSet.add(key))
    })
    return Array.from(keysSet)
  }, [analysisResult.entities])

  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    status: string
    nodes_created: number
    nodes_skipped: number
    errors: string[]
  } | null>(null)

  const handleIncludeChange = (rowIndex: number, include: boolean) => {
    setEntityMappings((prev) =>
      prev.map((mapping) =>
        mapping.row_index === rowIndex ? { ...mapping, include } : mapping
      )
    )
  }

  const handleTypeChange = (rowIndex: number, entityType: string) => {
    setEntityMappings((prev) =>
      prev.map((mapping) =>
        mapping.row_index === rowIndex
          ? { ...mapping, entity_type: entityType }
          : mapping
      )
    )
  }

  const handleLabelChange = (rowIndex: number, label: string) => {
    setEntityMappings((prev) =>
      prev.map((mapping) =>
        mapping.row_index === rowIndex ? { ...mapping, label } : mapping
      )
    )
  }

  const handleDataChange = (rowIndex: number, key: string, value: string) => {
    setEntityMappings((prev) =>
      prev.map((mapping) =>
        mapping.row_index === rowIndex
          ? { ...mapping, data: { ...mapping.data, [key]: value } }
          : mapping
      )
    )
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const result = await sketchService.executeImport(
        sketchId,
        file,
        entityMappings
      )
      setImportResult(result)

      if (result.status === 'completed') {
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    } catch (error) {
      toast.error('Failed to import entities. Please try again.')
    } finally {
      refetchGraph()
      setIsImporting(false)
      toast.success("Import successfull !")
    }
  }


  // Build entity types list from action items (flatten parent/children)
  const entityTypes = useMemo<string[]>(() => {
    if (!actionItems) return []
    const keys: string[] = []
    for (const item of actionItems) {
      if (item.children && item.children.length > 0) {
        for (const child of item.children) {
          if (child.label) keys.push(child.label)
        }
      } else if (item.label) {
        keys.push(item.label)
      }
    }
    // De-duplicate while preserving order
    return Array.from(new Set(keys))
  }, [actionItems])

  // Prepare table data
  const tableData: TableRow[] = useMemo(() => {
    return analysisResult.entities.map((entity) => ({
      ...entity,
      mapping: entityMappings.find(m => m.row_index === entity.row_index)!
    }))
  }, [analysisResult.entities, entityMappings])

  // Define columns
  const columns = useMemo(() => {
    const columnHelper: any = createColumnHelper() as any

    const baseColumns = [
      columnHelper.display({
        id: 'include',
        header: 'Include',
        size: 60,
        cell: ({ row }: { row: any }) => (
          <Checkbox
            checked={row.original.mapping.include}
            onCheckedChange={(checked) =>
              handleIncludeChange(row.original.row_index, checked as boolean)
            }
          />
        ),
      }),
      columnHelper.display({
        id: 'entity_type',
        header: 'Entity Type',
        size: 160,
        cell: ({ row }: { row: any }) => (
          <Select
            value={row.original.mapping.entity_type}
            onValueChange={(value) =>
              handleTypeChange(row.original.row_index, value)
            }
            disabled={!row.original.mapping.include || isLoadingActionItems}
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
        ),
      }),
      columnHelper.display({
        id: 'label',
        header: 'Label *',
        size: 200,
        cell: ({ row }: { row: any }) => (
          <Input
            className="h-8 w-full text-xs"
            value={row.original.mapping.label}
            onChange={(e) =>
              handleLabelChange(row.original.row_index, e.target.value)
            }
            disabled={!row.original.mapping.include}
            placeholder="Enter label..."
          />
        ),
      }),
    ]

    // Add dynamic data columns
    const dataColumns = allDataKeys.map((key) =>
      columnHelper.display({
        id: `data_${key}`,
        header: key,
        size: 200,
        cell: ({ row }: { row: any }) => (
          <Input
            className="h-8 w-full text-xs"
            value={row.original.mapping.data[key] || ''}
            onChange={(e) =>
              handleDataChange(row.original.row_index, key, e.target.value)
            }
            disabled={!row.original.mapping.include}
            placeholder="-"
          />
        ),
      })
    )

    return [...baseColumns, ...dataColumns]
  }, [allDataKeys, entityMappings])

  // Create table instance
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

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
                {importResult.nodes_skipped > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {importResult.nodes_skipped} entities skipped
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-orange-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Import Completed with Errors</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {importResult.nodes_created} entities created
                </p>
                <p className="text-sm text-muted-foreground">
                  {importResult.errors.length} errors encountered
                </p>
              </div>
              {importResult.errors.length > 0 && (
                <div className="w-full mt-4">
                  <Label>Errors:</Label>
                  <div className="h-32 w-full rounded-md border p-2 mt-2 overflow-auto">
                    {importResult.errors.map((error, idx) => (
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
    <div className="space-y-2">
      <div className="border rounded-lg">
        <div className="overflow-auto" style={{ maxHeight: '500px' }}>
          <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead className="bg-muted top-0 z-10">
              {table.getHeaderGroups().map((headerGroup: any) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header: any, index: number) => {
                    return (
                      <th
                        key={header.id}
                        className={`px-3 py-2 text-left text-xs font-medium border-b border-r`}
                        style={{
                          width: `${header.getSize()}px`,
                          minWidth: `${header.getSize()}px`,
                          maxWidth: `${header.getSize()}px`,
                          boxSizing: 'border-box',
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row: any) => (
                <tr
                  key={row.id}
                  className={`border-b ${!row.original.mapping.include ? 'opacity-50' : ''}`}
                >
                  {row.getVisibleCells().map((cell: any, index: number) => {
                    return (
                      <td
                        key={cell.id}
                        className={`px-3 py-2 border-r`}
                        style={{
                          width: `${cell.column.getSize()}px`,
                          minWidth: `${cell.column.getSize()}px`,
                          maxWidth: `${cell.column.getSize()}px`,
                          boxSizing: 'border-box',
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} entities
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isImporting}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={isImporting}>
          {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isImporting ? 'Importing...' : `Import ${entityMappings.filter(m => m.include).length} Entities`}
        </Button>
      </div>
    </div>
  )
}
