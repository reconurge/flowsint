import { Ellipsis } from "lucide-react";
import { useInvestigationContext } from "../contexts/investigation-provider";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
export default function MoreMenu() {
    const { setOpenSettingsModal, handleDeleteInvestigation } = useInvestigationContext();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <Ellipsis className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={setOpenSettingsModal}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteInvestigation} className="text-red-500">
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}