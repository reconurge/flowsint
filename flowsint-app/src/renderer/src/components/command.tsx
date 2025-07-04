"use client"

import * as React from "react"
import {
    Fingerprint,
    Search,
    Workflow,
    FileText,
    Waypoints,
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut"
import { Button } from "./ui/button"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { investigationService } from "@/api/investigation-service"
import { analysisService } from "@/api/analysis-service"
import { type Investigation } from "@/types/investigation"
import { type Analysis } from "@/types"
import { Skeleton } from "./ui/skeleton"

// Skeleton component for command palette loading
function CommandSkeleton() {
    return (
        <div className="space-y-2 p-2">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-md">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 flex-1" />
                </div>
            ))}
        </div>
    )
}

export function Command() {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Fetch investigations when dialog opens
    const { data: investigations = [], isLoading: isLoadingInvestigations } = useQuery({
        queryKey: ["command-investigations"],
        queryFn: investigationService.get,
        enabled: open, // Only fetch when dialog is open
    })

    // Fetch all analyses when dialog opens
    const { data: allAnalyses = [], isLoading: isLoadingAnalyses } = useQuery({
        queryKey: ["command-analyses"],
        queryFn: analysisService.get,
        enabled: open, // Only fetch when dialog is open
    })

    useKeyboardShortcut({
        key: "j",
        ctrlOrCmd: true,
        callback: () => {
            setOpen((prev) => !prev)
        },
    })

    // Filter investigations and analyses based on search query
    const filteredData = React.useMemo(() => {
        if (!searchQuery.trim()) {
            return { investigations, analyses: allAnalyses }
        }

        const query = searchQuery.toLowerCase().trim()

        const filteredInvestigations = investigations.filter((investigation: Investigation) => {
            const matchesName = investigation.name.toLowerCase().includes(query)
            const matchesDescription = investigation.description?.toLowerCase().includes(query)
            const matchesSketches = investigation.sketches?.some(sketch =>
                sketch.title.toLowerCase().includes(query)
            )
            // Check if any analyses in this investigation match the query
            const investigationAnalyses = allAnalyses.filter((analysis: Analysis) =>
                analysis.investigation_id === investigation.id
            )
            const matchesAnalyses = investigationAnalyses.some(analysis =>
                analysis.title.toLowerCase().includes(query) ||
                analysis.description?.toLowerCase().includes(query)
            )
            return matchesName || matchesDescription || matchesSketches || matchesAnalyses
        })

        // Filter analyses to only include those from filtered investigations
        const filteredAnalyses = allAnalyses.filter((analysis: Analysis) => {
            const matchesTitle = analysis.title.toLowerCase().includes(query)
            const matchesDescription = analysis.description?.toLowerCase().includes(query)
            const belongsToFilteredInvestigation = filteredInvestigations.some(inv => inv.id === analysis.investigation_id)
            return (matchesTitle || matchesDescription) && belongsToFilteredInvestigation
        })

        return { investigations: filteredInvestigations, analyses: filteredAnalyses }
    }, [investigations, allAnalyses, searchQuery])

    // Group analyses by investigation for display
    const analysesByInvestigation = React.useMemo(() => {
        const grouped: Record<string, Analysis[]> = {}
        filteredData.analyses.forEach((analysis: Analysis) => {
            if (analysis.investigation_id) {
                if (!grouped[analysis.investigation_id]) {
                    grouped[analysis.investigation_id] = []
                }
                grouped[analysis.investigation_id].push(analysis)
            }
        })
        return grouped
    }, [filteredData.analyses])

    const isLoading = isLoadingInvestigations || isLoadingAnalyses

    return (
        <>
            <Button variant="ghost" onClick={() => setOpen(true)} className="text-xs h-8 w-full max-w-3xs border flex items-center justify-between hover:border-muted-foreground text-muted-foreground">
                <span className="flex items-center gap-2"><Search /> Search Flowsint{" "}</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>J
                </kbd>
            </Button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder="Type a command or search..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                />
                <CommandList>
                    {isLoading ? (
                        <CommandSkeleton />
                    ) : (
                        <>
                            {filteredData.investigations.length === 0 && filteredData.analyses.length === 0 ? (
                                <CommandEmpty>No results found.</CommandEmpty>
                            ) : (
                                <>
                                    {filteredData.investigations.length > 0 && (
                                        <CommandGroup heading="Investigations">
                                            {filteredData.investigations.map((investigation: Investigation) => (
                                                <React.Fragment key={investigation.id}>
                                                    <CommandItem asChild>
                                                        <Link
                                                            onClick={() => setOpen(false)}
                                                            to="/dashboard/investigations/$investigationId"
                                                            params={{ investigationId: investigation.id }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <Fingerprint className="h-4 w-4" />
                                                            <span className="flex-1">{investigation.name}</span>
                                                        </Link>
                                                    </CommandItem>

                                                    {/* Show sketches for this investigation */}
                                                    {investigation.sketches?.map((sketch) => (
                                                        <CommandItem asChild key={sketch.id}>
                                                            <Link
                                                                onClick={() => setOpen(false)}
                                                                to="/dashboard/investigations/$investigationId/$type/$id"
                                                                params={{
                                                                    investigationId: investigation.id,
                                                                    type: "graph",
                                                                    id: sketch.id
                                                                }}
                                                                className="flex items-center gap-2 pl-6"
                                                            >
                                                                <Waypoints className="h-4 w-4" />
                                                                <span className="flex-1">{sketch.title}</span>
                                                            </Link>
                                                        </CommandItem>
                                                    ))}

                                                    {/* Show analyses for this investigation */}
                                                    {analysesByInvestigation[investigation.id]?.map((analysis) => (
                                                        <CommandItem asChild key={analysis.id}>
                                                            <Link
                                                                onClick={() => setOpen(false)}
                                                                to="/dashboard/investigations/$investigationId/$type/$id"
                                                                params={{
                                                                    investigationId: investigation.id,
                                                                    type: "analysis",
                                                                    id: analysis.id
                                                                }}
                                                                className="flex items-center gap-2 pl-6"
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                                <span className="flex-1">{analysis.title}</span>
                                                            </Link>
                                                        </CommandItem>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </CommandGroup>
                                    )}

                                    <CommandSeparator />
                                    <CommandGroup heading="Quick Actions">
                                        <CommandItem asChild>
                                            <Link onClick={() => setOpen(false)} to="/dashboard/investigations">
                                                <Fingerprint className="h-4 w-4" />
                                                <span>All Investigations</span>
                                            </Link>
                                        </CommandItem>
                                        <CommandItem asChild>
                                            <Link onClick={() => setOpen(false)} to="/dashboard/transforms">
                                                <Workflow className="h-4 w-4" />
                                                <span>Transforms</span>
                                            </Link>
                                        </CommandItem>
                                    </CommandGroup>
                                </>
                            )}
                        </>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    )
}
