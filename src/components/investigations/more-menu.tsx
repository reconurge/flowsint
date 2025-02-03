import { Ellipsis } from 'lucide-react';
import { useInvestigationContext } from "./investigation-provider";
import { DropdownMenu, IconButton } from "@radix-ui/themes";


export default function MoreMenu() {
    const { setOpenSettingsModal } = useInvestigationContext()

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <IconButton color="gray" variant="soft" size="2">
                    <Ellipsis className="h-4" />
                </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content size="2">
                <DropdownMenu.Item onClick={setOpenSettingsModal} shortcut="⌘ E">Settings</DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}
