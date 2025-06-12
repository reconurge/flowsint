"use client"

import type React from "react"
import { memo, useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Info, GripVertical } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getScannerColor } from "./scanner-data"

// Types for the scanner based on the new structure
export interface ScannerProperty {
  name: string
  type: string
}

export interface ScannerIO {
  type: string
  properties: ScannerProperty[]
}

export interface Scanner {
  class_name: string
  name: string
  module: string
  doc: string | null
  inputs: ScannerIO
  outputs: ScannerIO
  type: string
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
    prevProps.category === nextProps.category &&
    prevProps.color === nextProps.color
  )
}

// Memoized scanner item component for the sidebar
const ScannerItem = memo(({ scanner, category }: ScannerItemProps) => {
  const borderColor = getScannerColor(scanner.type, category)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div
          draggable
          onDragStart={onDragStart}
          className="p-3 rounded-md relative w-full overflow-hidden cursor-grab bg-card border hover:shadow-md transition-all group"
          style={{ borderLeftWidth: "4px", borderLeftColor: borderColor, cursor: "grab" }}
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-2">
              <GripVertical className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              <div className="space-y-1">
                <h3 className="text-sm font-medium">{scanner.class_name}</h3>
                {scanner.type !== "type" &&
                  <div className="mt-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Input:</span>
                      <span className="text-muted-foreground">{scanner.inputs.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Output:</span>
                      <span className="text-muted-foreground">{scanner.outputs.type}</span>
                    </div>
                  </div>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
            </div>
          </div>
        </div>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: borderColor }} />
              {scanner.class_name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm" style={{ color: borderColor }}>Description</h4>
              <p className="text-sm text-muted-foreground">{scanner.doc || "No description available"}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm" style={{ color: borderColor }}>Module</h4>
              <p className="text-sm text-muted-foreground">{scanner.module}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm" style={{ color: borderColor }}>Input Properties</h4>
              <div className="space-y-1">
                {scanner.inputs.properties.map((prop, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{prop.name}:</span>{" "}
                    <span className="text-muted-foreground">{prop.type}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm" style={{ color: borderColor }}>Output Properties</h4>
              <div className="space-y-1">
                {scanner.outputs.properties.map((prop, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{prop.name}:</span>{" "}
                    <span className="text-muted-foreground">{prop.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}, areEqual)

ScannerItem.displayName = "ScannerItem"

export default ScannerItem
