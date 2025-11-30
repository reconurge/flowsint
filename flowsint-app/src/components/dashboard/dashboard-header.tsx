"use client"

import { Plus, LayoutGrid, List, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DashboardHeaderProps {
  view: "grid" | "list"
  setView: (view: "grid" | "list") => void
}

export function DashboardHeader({ view, setView }: DashboardHeaderProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Investigations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your OSINT investigations</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Investigation
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search investigations..."
            className="w-72 h-9 pl-9 pr-3 text-sm bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-md">
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded transition-colors ${
              view === "list"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded transition-colors ${
              view === "grid"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
