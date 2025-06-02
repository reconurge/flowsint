import { investigationService } from "@/api/investigation-service"
import type { Investigation } from "@/types/investigation"
import { useQuery } from "@tanstack/react-query"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Sketch } from "@/types/sketch"
import NewInvestigation from "./new-investigation"
import { Button } from "../ui/button"
import { MoreVertical, PlusIcon, Search, Trash2, Waypoints } from "lucide-react"
import { Input } from "../ui/input"
import { cn } from "@/lib/utils"
import { Badge } from "../ui/badge"
import { Link, useParams } from "@tanstack/react-router"
import { SkeletonList } from "../shared/skeleton-list"
import { useSketchNavigation } from "@/hooks/use-sketch-navigation"
import { TabLink } from "../tab-link"
import { useConfirm } from "@/components/use-confirm-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { toast } from "sonner"
import { sketchService } from "@/api/sketch-service"

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
            try {
                await sketchService.delete(sketch.id);
                refetch()
                toast.success("Sketch deleted successfully");
            } catch (error) {
                toast.error("Failed to delete sketch");
            }
        }
    };

    return (
        <li>
            <TabLink
                id={sketch.id}
                type="graph"
                investigationId={investigationId}
                onNavigate={navigateToSketch}
            >
                {({ isActive }) => (
                    <div className={cn(
                        "px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 group",
                        isActive && "bg-muted text-foreground"
                    )}>
                        <div className="text-left flex items-center gap-2 w-full py-1 h-full truncate text-ellipsis">
                            <Badge variant={"outline"} className="text-[.5rem] p-1 !py-.5 text-yellow-500 border-none">
                                <Waypoints className="h-3 w-3" /> GRAPH
                            </Badge>
                            <span className="truncate text-ellipsis">{sketch.title}</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="ml-auto">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto opacity-0 group-hover:opacity-100">
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
                    </div>
                )}
            </TabLink>
        </li>
    );
};

const InvestigationList = () => {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["investigations", "list"],
        queryFn: investigationService.get,
    })
    const { investigationId } = useParams({ strict: false })
    const { confirm } = useConfirm();

    const handleDeleteInvestigation = async (investigation: Investigation, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = await confirm({
            title: "Delete Investigation",
            message: `Are you sure you want to delete "${investigation.name}"? This will also delete all sketches within it. This action cannot be undone.`
        });

        if (confirmed) {
            try {
                await investigationService.delete(investigation.id);
                refetch()
                toast.success("Investigation deleted successfully");
            } catch (error) {
                toast.error("Failed to delete investigation");
            }
        }
    };

    if (error) return <div>Error: {(error as Error).message}</div>
    return (
        <div className="w-full h-full bg-card flex flex-col overflow-hidden">
            <div className="p-2 flex items-center gap-2 border-b shrink-0">
                <NewInvestigation noDropDown>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <PlusIcon className="h-4 w-4" />
                    </Button>
                </NewInvestigation>
                <Input type="search" className="!border border-border h-7" placeholder="Search an investigation..." />
            </div>

            {isLoading ? (
                <div className="p-2">
                    <SkeletonList rowCount={7} />
                </div>
            ) : data && data.length > 0 ? (
                <Accordion
                    type="multiple"
                    defaultValue={investigationId ? [investigationId] : []}
                    className="w-full overflow-auto my-0 !py-0"
                >
                    {data?.map((investigation: Investigation) => (
                        <AccordionItem key={investigation.id} value={investigation.id}>
                            <AccordionTrigger className="px-2 py-1.5 text-muted-foreground text-sm hover:no-underline hover:bg-muted/50 group">
                                <div className="flex items-center gap-2 w-full">
                                    <Link
                                        to="/dashboard/investigations/$investigationId"
                                        params={{
                                            investigationId: investigation.id,
                                        }}
                                        className="truncate text-ellipsis hover:underline"
                                    >{investigation.name}</Link>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <div className="ml-auto">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto opacity-0 group-hover:opacity-100">
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
                            </AccordionTrigger>
                            <AccordionContent className="!py-0">
                                {investigation.sketches && investigation.sketches.length > 0 ? (
                                    <ul className="py-2 ml-6 border-l">
                                        {investigation.sketches.map((sketch: Sketch) => (
                                            <SketchListItem
                                                refetch={refetch}
                                                key={sketch.id}
                                                sketch={sketch}
                                                investigationId={investigation.id}
                                            />
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="px-6 text-sm text-muted-foreground italic opacity-60">This investigation is empty.</p>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="p-6 flex flex-col items-center text-center gap-3 text-muted-foreground">
                    <Search className="h-10 w-10" />
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-foreground">No investigations yet</h3>
                        <p className="text-xs opacity-70 max-w-xs">
                            You don't have any investigations yet. Create one to start organizing your sketches.
                        </p>
                    </div>
                    <NewInvestigation noDropDown>
                        <Button size="sm" variant="outline">
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Create your first investigation
                        </Button>
                    </NewInvestigation>
                </div>
            )
            }
        </div >
    )
}

export default InvestigationList