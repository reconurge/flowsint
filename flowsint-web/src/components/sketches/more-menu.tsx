import { Ellipsis } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
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
import { toast } from "sonner";
import { useConfirm } from "../use-confirm-dialog";
import { useRouter } from "next/navigation";
export default function MoreMenu({ sketch, user_id }: { sketch: Sketch, user_id: string }) {
    const [open, setOpen] = useState(false)
    const isOwner = sketch.owner_id == user_id
    const { confirm } = useConfirm()
    const router = useRouter()

    const handleDeleteSketch = async () => {
        if (!await confirm({ title: `Deleting sketch "${sketch.title}"`, message: "Are you sure you want to delete this sketch ? All nodes from it will be lost." })) return
        return toast.promise(
            async () => {
                const sketch_id = sketch.id
                if (!sketch_id) {
                    throw new Error("No sketch ID provided");
                }
                const { error } = await supabase
                    .from('sketches')
                    .delete()
                    .eq('id', sketch_id);
                if (error) {
                    throw error;
                }
                router.push(`/dashboard/investigations/${sketch.investigation_id}`)
                return "Sketch successfully deleted";
            },
            {
                loading: 'Deleting sketch...',
                success: (data) => `${data}`,
                error: (err) => `Failed to delete sketch: ${err.message}`
            }
        );
    };
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