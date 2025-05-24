import { investigationService } from "@/api/investigation-service"
import type { Investigation } from "@/types/investigation"
import { useQuery } from "@tanstack/react-query"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Sketch } from "@/types/sketch"
import NewInvestigation from "./new-investigation"
import { Button } from "../ui/button"
import { PlusIcon, Waypoints } from "lucide-react"
import { Input } from "../ui/input"
import { cn } from "@/lib/utils"
import NewSketch from "../sketches/new-sketch"
import Loader from "../loader"
import { Badge } from "../ui/badge"
import { Link, useParams } from "@tanstack/react-router"

const InvestigationList = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["investigations", "list"],
        queryFn: investigationService.get,
    })
    const { id } = useParams({ strict: false })

    if (error) return <div>Error: {(error as Error).message}</div>

    return (
        <div className="w-full bg-card h-full overflow-y-auto">
            <div className="p-2 flex items-center gap-2">
                <NewInvestigation noDropDown>
                    <Button variant={"ghost"} size={"icon"} className="h-7 w-7"><PlusIcon className="h-4 w-4" /></Button>
                </NewInvestigation>
                <Input type="search" className="!border border-border h-7" placeholder="Search an investigation..." />
            </div>
            {isLoading ? <div className="flex items-center"><Loader /> Loading...</div> :
                <Accordion type="multiple" defaultValue={data?.map((d: Investigation) => d.id)} className="w-full rounded-none">
                    {Array.isArray(data) && data?.map((investigation: Investigation) => (
                        <AccordionItem key={investigation.id} value={investigation.id.toString()}>
                            <AccordionTrigger className={cn("px-4 py-1 border-l-2 border-l-transparent text-left rounded-none hover:bg-muted/50")}>
                                <div className="font-medium">{investigation.name}</div>
                            </AccordionTrigger>
                            <AccordionContent>
                                {investigation.sketches && investigation.sketches.length > 0 ? (
                                    <ul className="py-2 border-l">
                                        {investigation.sketches.map((sketch: Sketch) => (
                                            <li key={sketch.id} className={cn("pr-2 pl-6 text-muted-foreground hover:text-foreground hover:bg-muted/50 border-l-2 border-l-transparent", id === sketch.id && "border-l-primary bg-muted text-foreground")}>
                                                <Link
                                                    to="/dashboard/investigations/$investigationId/$type/$id"
                                                    params={{ investigationId: investigation.id, type: "graph", id: sketch.id }}
                                                    className="text-left flex items-center gap-2 w-full py-1 h-full"
                                                >
                                                    <Badge variant={"outline"} className="text-[.5rem] p-1 !py-.5 text-yellow-500 border-none"><Waypoints className="h-3 w-3" /> SKETCH</Badge> {sketch.title}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="px-6 py-2 text-sm text-muted-foreground">This investigation is empty. <NewSketch noDropDown><button className="text-primary underline cursor-pointer">Add a sketch</button></NewSketch> to start investigating.</p>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            }
            {
                data && data.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">No investigations found</div>
                )
            }
        </div >
    )
}

export default InvestigationList