import { Ellipsis } from 'lucide-react';
import { useInvestigationContext } from "../contexts/investigation-provider";
import { DropdownMenu, IconButton } from "@radix-ui/themes";


export default function MoreMenu() {
    const { setOpenSettingsModal, handleDeleteInvestigation } = useInvestigationContext()

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <IconButton color="gray" variant="soft" size="2">
                    <Ellipsis className="h-4" />
                </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content size="2">
                <DropdownMenu.Item onClick={setOpenSettingsModal} shortcut="⌘ E">Settings</DropdownMenu.Item>
                <DropdownMenu.Item onClick={handleDeleteInvestigation} shortcut="⌘ ⌫" color="red">
                    Delete
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}
