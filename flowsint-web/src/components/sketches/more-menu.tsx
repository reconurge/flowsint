import { Ellipsis } from "lucide-react";
import { useSketchStore } from '@/store/sketch-store';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AddInvestigationModal } from "./add-contributor";
import { useState } from "react";
import { Sketch } from "@/types/sketch";
export default function MoreMenu({ sketch, user_id }: { sketch: Sketch, user_id: string }) {
    const { setOpenSettingsModal, handleDeleteSketch } = useSketchStore();
    const [open, setOpen] = useState(false)
    const isOwner = sketch.owner_id == user_id
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-none border-none">
                        <Ellipsis className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {isOwner &&
                        <DropdownMenuItem onClick={() => setOpen(true)}>Add contributor</DropdownMenuItem>}
                    {/* @ts-ignore */}
                    <DropdownMenuItem onClick={setOpenSettingsModal}>Settings</DropdownMenuItem>
                    {isOwner &&
                        <DropdownMenuItem onClick={handleDeleteSketch} className="text-red-500">
                            Delete
                        </DropdownMenuItem>}
                </DropdownMenuContent>
            </DropdownMenu>
            {isOwner &&
                <AddInvestigationModal
                    sketchId={sketch.id}
                    setOpen={setOpen}
                    open={open}
                />}
        </>
    );
}