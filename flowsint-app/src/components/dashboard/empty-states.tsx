import { Button } from "@/components/ui/button"
import { Plus, Upload } from "lucide-react"
import NewSketch from "../sketches/new-sketch"
import NewAnalysis from "../analyses/new-analysis"

interface EmptyStateProps {
    onAction?: () => void
}

export function EmptyInvestigations({ onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            {/* Minimal folder illustration */}
            <div className="w-16 h-16 mb-6 text-muted-foreground/30">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M8 16C8 13.7909 9.79086 12 12 12H24L28 16H52C54.2091 16 56 17.7909 56 20V48C56 50.2091 54.2091 52 52 52H12C9.79086 52 8 50.2091 8 48V16Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M28 32L32 36L36 32"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path d="M32 24V36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No investigations yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-[240px] mb-5">
                Create your first investigation to start tracking threats and entities
            </p>
            <Button onClick={onAction} size="sm" className="h-8 text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                New Investigation
            </Button>
        </div>
    )
}

export function EmptySketches({ onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-border rounded-lg">
            {/* Minimal graph/network illustration */}
            <div className="w-14 h-14 mb-5 text-muted-foreground/30">
                <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="28" cy="14" r="6" stroke="currentColor" strokeWidth="2" />
                    <circle cx="14" cy="42" r="6" stroke="currentColor" strokeWidth="2" />
                    <circle cx="42" cy="42" r="6" stroke="currentColor" strokeWidth="2" />
                    <path d="M24 19L17 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M32 19L39 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M20 42H36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No sketches</h3>
            <p className="text-xs text-muted-foreground text-center max-w-[200px] mb-4">
                Visualize relationships between entities, infrastructure, and actors
            </p>
            <NewSketch>
                <Button onClick={onAction} variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Create sketch
                </Button>
            </NewSketch>
        </div>
    )
}

export function EmptyAnalyses({ onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-10 px-4">
            {/* Minimal document illustration */}
            <div className="w-12 h-12 mb-4 text-muted-foreground/30">
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M12 6H30L38 14V42C38 43.1046 37.1046 44 36 44H12C10.8954 44 10 43.1046 10 42V8C10 6.89543 10.8954 6 12 6Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path d="M30 6V14H38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 24H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M16 30H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M16 36H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No analyses</h3>
            <p className="text-xs text-muted-foreground text-center max-w-[200px] mb-4">
                Document findings, patterns, and conclusions from your investigation
            </p>
            <NewAnalysis>
                <Button onClick={onAction} variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Write analysis
                </Button>
            </NewAnalysis>
        </div>
    )
}

export function EmptyEvidence({ onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-border rounded-lg">
            {/* Minimal upload/file illustration */}
            <div className="w-12 h-12 mb-4 text-muted-foreground/30">
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M24 18V30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path
                        d="M18 24L24 18L30 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No evidence</h3>
            <p className="text-xs text-muted-foreground text-center max-w-[180px] mb-4">
                Upload files, screenshots, or artifacts related to this case
            </p>
            <Button onClick={onAction} variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Upload files
            </Button>
        </div>
    )
}

export function EmptyTasks({ onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-8 px-4">
            {/* Minimal checklist illustration */}
            <div className="w-10 h-10 mb-3 text-muted-foreground/30">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="8" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 11H34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <rect x="6" y="18" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 21H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <rect x="6" y="28" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 31H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </div>
            <h3 className="text-xs font-medium text-foreground mb-0.5">No tasks</h3>
            <p className="text-xs text-muted-foreground text-center mb-3">Track work for this case</p>
            <Button onClick={onAction} variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1">
                <Plus className="w-3 h-3" />
                Add task
            </Button>
        </div>
    )
}

export function EmptyActivity() {
    return (
        <div className="flex flex-col items-center justify-center py-8 px-4">
            {/* Minimal timeline/clock illustration */}
            <div className="w-10 h-10 mb-3 text-muted-foreground/30">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="2" />
                    <path
                        d="M20 12V20L26 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <h3 className="text-xs font-medium text-foreground mb-0.5">No activity yet</h3>
            <p className="text-xs text-muted-foreground text-center max-w-[160px]">Actions on this case will appear here</p>
        </div>
    )
}

export function EmptySearchResults() {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            {/* Minimal search illustration */}
            <div className="w-14 h-14 mb-5 text-muted-foreground/30">
                <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2" />
                    <path d="M34 34L46 46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M18 24H30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No results found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-[220px]">
                Try adjusting your search or filters to find what you're looking for
            </p>
        </div>
    )
}
