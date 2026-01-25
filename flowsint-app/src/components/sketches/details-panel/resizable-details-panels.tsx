'use client'

import React, { memo, useState, useCallback, useMemo } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { cn } from '@/lib/utils'
import { ChevronRight, GripHorizontal } from 'lucide-react'

// Section Header Component
const SectionHeader = memo(
  ({
    label,
    isOpen,
    onToggle,
    count
  }: {
    label: string
    isOpen: boolean
    onToggle: () => void
    count?: number
  }) => (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 w-full px-3 py-2 text-left border-b border-border bg-muted/30 hover:bg-muted/50 transition-colors shrink-0"
    >
      <ChevronRight
        className={cn(
          'h-3 w-3 text-muted-foreground/50 transition-transform duration-150',
          isOpen && 'rotate-90'
        )}
      />
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-muted-foreground/40 ml-1">{count}</span>
      )}
    </button>
  )
)
SectionHeader.displayName = 'SectionHeader'

// Resize Handle Component
const ResizeHandle = memo(({ id }: { id: string }) => (
  <PanelResizeHandle
    id={`resize-handle-${id}`}
    className="h-2 flex items-center justify-center bg-border/30 hover:bg-border/60 transition-colors group relative"
  >
    <GripHorizontal className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
  </PanelResizeHandle>
))
ResizeHandle.displayName = 'ResizeHandle'

// Panel Section Props
export type PanelSectionConfig = {
  id: string
  label: string
  content: React.ReactNode
  defaultOpen?: boolean
  fixedSize?: number // percentage - makes section non-resizable
  defaultSize?: number // percentage
  minSize?: number // percentage
}

// Main Resizable Details Panel
export function ResizableDetailsPanel({
  sections,
  className
}: {
  sections: PanelSectionConfig[]
  className?: string
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    sections.reduce(
      (acc, section) => ({
        ...acc,
        [section.id]: section.defaultOpen ?? true
      }),
      {}
    )
  )

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  // Get open sections while maintaining original order
  const openSectionsList = useMemo(
    () => sections.filter((s) => openSections[s.id]),
    [sections, openSections]
  )

  // Calculate default sizes for open sections
  const getDefaultSize = useCallback(
    (section: PanelSectionConfig) => {
      if (section.fixedSize) return section.fixedSize
      if (section.defaultSize) return section.defaultSize
      // Distribute remaining space equally
      const fixedTotal = openSectionsList
        .filter((s) => s.fixedSize)
        .reduce((sum, s) => sum + (s.fixedSize || 0), 0)
      const flexibleCount = openSectionsList.filter((s) => !s.fixedSize).length
      return flexibleCount > 0 ? (100 - fixedTotal) / flexibleCount : 100 / openSectionsList.length
    },
    [openSectionsList]
  )

  // Build the render structure: interleave collapsed headers with resizable panel group
  // We render collapsed sections inline, in their original position
  const buildRenderGroups = () => {
    const result: React.ReactNode[] = []
    let currentOpenGroup: PanelSectionConfig[] = []

    const flushOpenGroup = () => {
      if (currentOpenGroup.length > 0) {
        const groupKey = currentOpenGroup.map((s) => s.id).join('-')
        result.push(
          <PanelGroup key={groupKey} direction="vertical" className="flex-1 min-h-0">
            {currentOpenGroup.map((section, index) => {
              const isLast = index === currentOpenGroup.length - 1
              return (
                <React.Fragment key={section.id}>
                  <Panel
                    id={section.id}
                    defaultSize={getDefaultSize(section)}
                    minSize={section.minSize ?? 8}
                    className="flex flex-col min-h-0"
                  >
                    <SectionHeader
                      label={section.label}
                      isOpen={true}
                      onToggle={() => toggleSection(section.id)}
                    />
                    <div className="flex-1 overflow-y-auto min-h-0">{section.content}</div>
                  </Panel>
                  {!isLast && <ResizeHandle id={section.id} />}
                </React.Fragment>
              )
            })}
          </PanelGroup>
        )
        currentOpenGroup = []
      }
    }

    sections.forEach((section) => {
      const isOpen = openSections[section.id]

      if (isOpen) {
        currentOpenGroup.push(section)
      } else {
        // Flush any accumulated open sections first
        flushOpenGroup()
        // Then render the collapsed header
        result.push(
          <SectionHeader
            key={`collapsed-${section.id}`}
            label={section.label}
            isOpen={false}
            onToggle={() => toggleSection(section.id)}
          />
        )
      }
    })

    // Flush any remaining open sections
    flushOpenGroup()

    return result
  }

  return (
    <div className={cn('flex flex-col h-full bg-card overflow-hidden', className)}>
      {buildRenderGroups()}
    </div>
  )
}

// Row Component for displaying key-value pairs
export const Row = memo(({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-1.5 group hover:bg-muted/20 -mx-2 px-2 rounded-sm transition-colors">
    <span className="text-[13px] text-muted-foreground">{label.replace(/_/g, ' ')}</span>
    <div className="text-[13px] grow text-foreground flex items-center justify-end gap-1">
      {children}
    </div>
  </div>
))
Row.displayName = 'Row'
