
import { Button } from "@/components/ui/button"
import { Plus, ArrowUpRight } from "lucide-react"
import { EmptySketches } from "../empty-states"
import { Sketch } from "@/types"
import { formatDistanceToNow } from "date-fns"
import { Link } from "@tanstack/react-router"
import NewSketch from "@/components/sketches/new-sketch"

interface SketchesSectionProps {
  sketches: Sketch[]
}


export function SketchesSection({ sketches }: SketchesSectionProps) {
  const isEmpty = sketches.length === 0
  return (
    <section className="my-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">Sketches</h2>
        {!isEmpty && (
          <NewSketch>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
          </NewSketch>
        )}
      </div>

      {isEmpty ? (
        <EmptySketches onAction={() => console.log("Create sketch")} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sketches.map((sketch) => (
            <Link
              to="/dashboard/investigations/$investigationId/$type/$id"
              params={{
                investigationId: sketch.investigation_id as string,
                type: "graph",
                id: sketch.id
              }}
              key={sketch.id}
              className="group block p-4 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
            >
              <div className="h-24 rounded bg-secondary/50 mb-3 flex items-center justify-center relative overflow-hidden">
                <svg className="w-full h-full opacity-40" viewBox="0 0 120 60">
                  <line x1="20" y1="30" x2="60" y2="20" stroke="currentColor" strokeWidth="1" className="text-border" />
                  <line
                    x1="60"
                    y1="20"
                    x2="100"
                    y2="35"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-border"
                  />
                  <line x1="20" y1="30" x2="50" y2="45" stroke="currentColor" strokeWidth="1" className="text-border" />
                  <circle cx="20" cy="30" r="4" fill="currentColor" className="text-muted-foreground" />
                  <circle cx="60" cy="20" r="5" fill="currentColor" className="text-muted-foreground" />
                  <circle cx="100" cy="35" r="4" fill="currentColor" className="text-muted-foreground" />
                  <circle cx="50" cy="45" r="3" fill="currentColor" className="text-muted-foreground" />
                </svg>
                <ArrowUpRight className="absolute top-2 right-2 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <h4 className="font-medium text-foreground text-sm mb-1">{sketch.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{sketch.description ? sketch.description : <span className="italic">No description provided.</span>}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(sketch.last_updated_at), {
                  addSuffix: true
                })}</span>
              </div>
            </Link>
          ))}
        </div>
      )
      }
    </section >
  )
}
