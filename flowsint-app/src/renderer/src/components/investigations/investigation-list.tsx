import { investigationService } from "@/api/investigation-service"
import type { Investigation } from "@/types/investigation"
import { useQuery } from "@tanstack/react-query"
import type { Sketch } from "@/types/sketch"
import NewInvestigation from "./new-investigation"
import { Button } from "../ui/button"
import { MoreVertical, PlusIcon, Trash2, Waypoints } from "lucide-react"
import { Input } from "../ui/input"
import { cn } from "@/lib/utils"
import { Link, useParams } from "@tanstack/react-router"
import { SkeletonList } from "../shared/skeleton-list"
import { useSketchNavigation } from "@/hooks/use-sketch-navigation"
import { TabLink } from "../tab-link"
import { useConfirm } from "@/components/use-confirm-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { toast } from "sonner"
import { sketchService } from "@/api/sketch-service"
import { useState, useMemo } from "react"

export const SketchListItem = ({ sketch, investigationId, refetch }: { sketch: Sketch, investigationId: string, refetch: () => void }) => {
    const { navigateToSketch } = useSketchNavigation({
        sketchId: sketch.id,
        investigationId,
    });
    const { confirm } = useConfirm();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = await confirm({
            title: "Delete Sketch",
            message: `Are you sure you want to delete "${sketch.title}"? This action cannot be undone.`
        });

        if (confirmed) {
            const deletePromise = () => sketchService.delete(sketch.id).then(() => refetch());

            toast.promise(deletePromise, {
                loading: 'Deleting sketch...',
                success: () => `Sketch "${sketch.title}" has been deleted`,
                error: 'Failed to delete sketch'
            });
        }
    };

    return (
        <TabLink
            id={sketch.id}
            type="graph"
            investigationId={investigationId}
            onNavigate={navigateToSketch}
        >
            {({ isActive }) => (
                <div className={cn(
                    "flex items-center gap-2 px-3 py-2",
                    isActive ? "bg-muted" : "hover:bg-muted/50"
                )}>
                    <Waypoints className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-sm truncate">{sketch.title}</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </TabLink>
    );
};

const InvestigationList = () => {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["investigations", "list"],
        queryFn: investigationService.get,
    })
    const { investigationId } = useParams({ strict: false })
    const { confirm } = useConfirm();
    const [searchQuery, setSearchQuery] = useState("")

    const filteredInvestigations = useMemo(() => {
        if (!data) return []
        if (!searchQuery.trim()) return data

        const query = searchQuery.toLowerCase().trim()
        return data.filter((investigation) => {
            const matchesInvestigation = investigation.name.toLowerCase().includes(query)
            const matchesSketches = investigation.sketches?.some(sketch => 
                sketch.title.toLowerCase().includes(query)
            )
            return matchesInvestigation || matchesSketches
        })
    }, [data, searchQuery])

    const handleDeleteInvestigation = async (investigation: Investigation, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = await confirm({
            title: "Delete Investigation",
            message: `Are you sure you want to delete "${investigation.name}"? This will also delete all sketches within it. This action cannot be undone.`
        });

        if (confirmed) {
            const deletePromise = () => investigationService.delete(investigation.id).then(() => refetch());
            toast.promise(deletePromise, {
                loading: 'Deleting investigation...',
                success: () => `Investigation "${investigation.name}" has been deleted`,
                error: 'Failed to delete investigation'
            });
        }
    };

    if (error) return <div>Error: {(error as Error).message}</div>
    return (
        <div className="w-full h-full bg-card flex flex-col overflow-hidden">
            <div className="p-2 flex items-center gap-2 border-b">
                <NewInvestigation noDropDown>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <PlusIcon className="h-4 w-4" />
                    </Button>
                </NewInvestigation>
                <Input
                    type="search"
                    className="h-7"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="p-2">
                    <SkeletonList rowCount={7} />
                </div>
            ) : filteredInvestigations.length > 0 ? (
                <div className="overflow-auto">
                    {filteredInvestigations.map((investigation: Investigation) => (
                        <div key={investigation.id}>
                            <div className="flex items-center gap-2 px-3 py-2 border-b">
                                <Link
                                    to="/dashboard/investigations/$investigationId"
                                    params={{
                                        investigationId: investigation.id,
                                    }}
                                    className={cn(
                                        "flex-1 text-sm font-medium hover:underline",
                                        investigationId === investigation.id && "text-primary"
                                    )}
                                >
                                    {investigation.name}
                                </Link>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem variant="destructive" onClick={(e) => handleDeleteInvestigation(investigation, e)}>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {investigation.sketches && investigation.sketches.length > 0 ? (
                                <div className="pl-4">
                                    {investigation.sketches.map((sketch: Sketch) => (
                                        <SketchListItem
                                            refetch={refetch}
                                            key={sketch.id}
                                            sketch={sketch}
                                            investigationId={investigation.id}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="px-7 py-2 text-sm text-muted-foreground">
                                    Empty
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 p-4">
                    <p className="text-sm text-muted-foreground">
                        No investigations yet
                    </p>
                    <NewInvestigation noDropDown>
                        <Button size="sm" variant="outline">
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Create investigation
                        </Button>
                    </NewInvestigation>
                </div>
            )}
        </div>
    )
}

export default InvestigationList