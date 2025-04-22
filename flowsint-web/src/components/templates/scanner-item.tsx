"use client"

import type React from "react"
import { memo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Types for the scanner
export interface Scanner {
  class_name: string
  name: string
  module: string
  doc: string | null
  key: string
}

interface ScannerItemProps {
  scanner: Scanner
  category: string
  color: string
}

// Custom equality function for ScannerItem
function areEqual(prevProps: ScannerItemProps, nextProps: ScannerItemProps) {
  return (
    prevProps.scanner.class_name === nextProps.scanner.class_name &&
    prevProps.scanner.name === nextProps.scanner.name &&
    prevProps.scanner.module === nextProps.scanner.module &&
    prevProps.scanner.doc === nextProps.scanner.doc &&
    prevProps.scanner.key === nextProps.scanner.key &&
    prevProps.category === nextProps.category &&
    prevProps.color === nextProps.color
  )
}

// Memoized scanner item component for the sidebar
const ScannerItem = memo(({ scanner, category, color }: ScannerItemProps) => {
  // Handler for drag start - using useCallback to prevent recreation on each render
  const onDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const data = { ...scanner, category }
      event.dataTransfer.setData("application/json", JSON.stringify(data))
      event.dataTransfer.effectAllowed = "move"
    },
    [scanner, category],
  )

  return (
    <TooltipProvider>
      <div
        draggable
        onDragStart={onDragStart}
        className="p-3 rounded-md cursor-grab bg-card border hover:shadow-md transition-shadow"
        style={{ borderLeftWidth: "4px", borderLeftColor: color, cursor: "grab" }}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium">{scanner.class_name}</h3>
            <p className="text-xs text-muted-foreground">{scanner.name}</p>
          </div>
          {scanner.doc && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{scanner.doc}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}, areEqual)

ScannerItem.displayName = "ScannerItem"

export default ScannerItem
