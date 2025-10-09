import {
  type Table,
  type Row,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import React from 'react'
import { Row as RowItem } from '@/types/table'
import { cn } from '@/lib/utils'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  noStickyCol?: boolean
}

// Stable style objects to prevent re-renders
const BASE_ROW_STYLE = {
  display: 'table' as const,
  width: '100%',
  tableLayout: 'fixed' as const,
  zIndex: 0
}

const TABLE_STYLE = {
  borderCollapse: 'separate' as const,
  tableLayout: 'fixed' as const,
  borderSpacing: 0,
  width: '100%'
}

const TBODY_STYLE = {
  display: 'block' as const
}

// Memoized row component to prevent unnecessary re-renders
const VirtualRow = React.memo<{
  row: Row<RowItem>
  virtualRow: any
  lastCellIndex: number
  columnSizeVars: Record<string, number>
  noStickyCol?: boolean
}>(({ row, virtualRow, lastCellIndex, columnSizeVars, noStickyCol }) => {
  const visibleCells = row.getVisibleCells()

  // Memoize the row style with transform
  const rowStyle = React.useMemo(
    () => ({
      ...BASE_ROW_STYLE,
      height: `${virtualRow.size}px`
    }),
    [virtualRow.size]
  )

  return (
    <tr
      key={row.id}
      data-index={virtualRow.index}
      className="border-b hover:bg-muted/50 divide-x overflow-y-hidden"
      style={rowStyle}
    >
      {visibleCells.map((cell, index) => (
        <VirtualCell
          key={cell.id}
          cell={cell}
          index={index}
          isFirst={index === 0 || index === 1}
          isBeforeLast={index === lastCellIndex - 1}
          isLast={index === lastCellIndex}
          columnSizeVars={columnSizeVars}
          noStickyCol={noStickyCol}
        />
      ))}
    </tr>
  )
})

// Memoized cell component
const VirtualCell = React.memo<{
  cell: any
  index: number
  isFirst: boolean
  isLast: boolean
  isBeforeLast: boolean
  columnSizeVars: Record<string, number>
  noStickyCol?: boolean
}>(({ cell, index, isFirst, isLast, isBeforeLast, columnSizeVars, noStickyCol }) => {
  const cellStyle = React.useMemo(
    () => ({
      width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
      minWidth: `calc(var(--col-${cell.column.id}-size) * 1px)`,
      maxWidth: `calc(var(--col-${cell.column.id}-size) * 1px)`,
      height: '40px',
      verticalAlign: 'middle',
      textAlign: 'center'
    }),
    [cell.column.id, columnSizeVars[`--col-${cell.column.id}-size`]]
  )

  const cellClassName = React.useMemo(
    () =>
      cn(
        'px-4 py-1 truncate relative overflow-hidden',
        !isBeforeLast && !isLast && 'border-r',
        index === 0 && !noStickyCol && 'sticky z-10 left-0 bg-card border-b border-r',
        index === 1 && !noStickyCol && 'sticky z-11 left-[50px] bg-card border-b border-r',
        isLast && !noStickyCol && 'sticky right-0 z-10 bg-background px-0 border-l border-b'
      ),
    [isFirst, isLast, index, isBeforeLast]
  )

  return (
    <td
      className={cellClassName}
      //@ts-ignore
      style={cellStyle}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </td>
  )
})

// Table body component
const TableBody = ({
  table,
  tableContainerRef,
  columnSizeVars,
  noStickyCol
}: {
  table: Table<any>
  tableContainerRef: React.RefObject<HTMLDivElement>
  columnSizeVars: Record<string, number>
  noStickyCol?: boolean
}) => {
  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 40, // Hauteur estimée de chaque ligne
    getScrollElement: () => tableContainerRef.current
  })

  // Memoize empty state
  const emptyState = React.useMemo(
    () => (
      <tbody>
        <tr>
          <td colSpan={table.getHeaderGroups()[0]?.headers.length || 1}>
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <div className="text-md font-medium">No data found yet.</div>
                <div className="text-xs">No nodes to display</div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    ),
    [table.getHeaderGroups()[0]?.headers.length]
  )

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const lastCellIndex = rows[0]?.getVisibleCells().length - 1 || 0

  const tbodyStyle = React.useMemo(
    () => ({
      ...TBODY_STYLE,
      height: `${totalSize}px`,
      paddingTop: virtualRows.length > 0 ? `${virtualRows[0]?.start ?? 0}px` : 0
    }),
    [totalSize, virtualRows]
  )

  if (rows.length === 0) {
    return emptyState
  }

  return (
    <tbody style={tbodyStyle}>
      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index] as Row<RowItem>
        return (
          <VirtualRow
            key={row.id}
            row={row}
            virtualRow={virtualRow}
            lastCellIndex={lastCellIndex}
            columnSizeVars={columnSizeVars}
            noStickyCol={noStickyCol}
          />
        )
      })}
      {/* Spacer pour maintenir la hauteur totale */}
      {virtualRows.length > 0 && (
        <tr style={{ height: `${totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)}px` }}>
          <td
            colSpan={table.getHeaderGroups()[0]?.headers.length || 1}
            style={{ padding: 0, border: 'none' }}
          />
        </tr>
      )}
    </tbody>
  )
}

export const MemoizedTableBody = React.memo(TableBody, (prev, next) => {
  const prevRows = prev.table.getRowModel().rows
  const nextRows = next.table.getRowModel().rows
  const prevSort = prev.table.getState().sorting
  const nextSort = next.table.getState().sorting
  const prevFilter = prev.table.getState().columnFilters
  const nextFilter = next.table.getState().columnFilters
  // 1. Si le tri ou les filtres changent, on re-render
  if (prevSort !== nextSort) return false
  if (prevFilter !== nextFilter) return false
  // 2. Si le nombre de lignes change, on re-render
  if (prevRows.length !== nextRows.length) return false
  return prevRows === nextRows
}) as typeof TableBody

// Memoized header cell component
const HeaderCell = React.memo<{
  header: any
  index: number
  isFirst: boolean
  isLast: boolean
  isBeforeLast: boolean
  columnSizeVars: Record<string, number>
  noStickyCol?: boolean
}>(({ header, index, isFirst, isLast, isBeforeLast, columnSizeVars, noStickyCol }) => {
  const headerStyle = React.useMemo(
    () => ({
      width: `calc(var(--header-${header.id}-size) * 1px)`,
      minWidth: `calc(var(--header-${header.id}-size) * 1px)`,
      maxWidth: `calc(var(--header-${header.id}-size) * 1px)`
    }),
    [header.id, columnSizeVars[`--header-${header.id}-size`]]
  )

  const headerClassName = React.useMemo(
    () =>
      cn(
        !isBeforeLast && !isLast && 'border-r',
        'px-4 py-1 text-center font-medium text-muted-foreground border-b overflow-hidde',
        isFirst && !noStickyCol && `!sticky z-30`,
        index === 0 && !noStickyCol && 'left-0 bg-card',
        index === 1 && !noStickyCol && 'left-[50px] bg-card',
        isLast && !noStickyCol && '!sticky right-0 z-30 bg-background border-l'
      ),
    [isFirst, isLast, index, isBeforeLast]
  )

  return (
    <th className={headerClassName} style={headerStyle}>
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
      {header.column.getCanResize() && (
        <div
          onDoubleClick={() => header.column.resetSize()}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={`resizer ${header.column.getIsResizing() ? 'isResizing' : ''}`}
        />
      )}
    </th>
  )
})

export function DataTable<TData, TValue>({
  columns,
  data,
  noStickyCol = false
}: DataTableProps<TData, TValue>) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null)
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 60,
      maxSize: 800
    },
    debugTable: false,
    debugHeaders: false,
    debugColumns: false
  })

  // Optimize column size variables calculation
  const columnSizeVars = React.useMemo(() => {
    const headers = table.getFlatHeaders()
    const colSizes: { [key: string]: number } = {}
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!
      colSizes[`--header-${header.id}-size`] = header.getSize()
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize()
    }
    return colSizes
  }, [
    table.getState().columnSizing,
    // Only depend on the actual sizing values, not the entire state objects
    JSON.stringify(table.getState().columnSizing)
  ])

  // Memoize table style
  const tableStyle = React.useMemo(
    () => ({
      ...TABLE_STYLE,
      ...columnSizeVars,
      width: table.getTotalSize()
    }),
    [columnSizeVars, table.getTotalSize()]
  )

  // Memoize header groups and calculate indices once
  const headerGroups = table.getHeaderGroups()
  const lastColumnIndex = headerGroups[0]?.headers.length - 1

  return (
    <div className="h-full w-full overflow-auto border-t p-0 relative" ref={tableContainerRef}>
      <table style={tableStyle}>
        <thead className="sticky top-0 z-20 bg-background">
          {headerGroups.map((headerGroup) => (
            <tr key={headerGroup.id} className="px-0">
              {headerGroup.headers.map((header, index) => (
                <HeaderCell
                  key={header.id}
                  header={header}
                  index={index}
                  isBeforeLast={index === lastColumnIndex - 1}
                  isFirst={index === 0 || index === 1}
                  isLast={index === lastColumnIndex}
                  columnSizeVars={columnSizeVars}
                  noStickyCol={noStickyCol}
                />
              ))}
            </tr>
          ))}
        </thead>
        <TableBody
          table={table}
          tableContainerRef={tableContainerRef}
          columnSizeVars={columnSizeVars}
          noStickyCol={noStickyCol}
        />
      </table>
    </div>
  )
}
