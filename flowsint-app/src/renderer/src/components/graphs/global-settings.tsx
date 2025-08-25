import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import { useGraphGeneralSettingsStore } from "@/stores/graph-general-store"
import { isMacOS } from "@/components/analyses/editor/utils"

export default function GlobalSettings() {
    const settingsModalOpen = useGraphGeneralSettingsStore(s => s.settingsModalOpen)
    const setSettingsModalOpen = useGraphGeneralSettingsStore(s => s.setSettingsModalOpen)

    return (
        <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>General settings</DialogTitle>
                    <DialogDescription>
                        Make changes to your general settings here. Click save when you&apos;re
                        done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    Comming soon.
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function KeyboardShortcuts() {
    const keyboardShortcutsOpen = useGraphGeneralSettingsStore(s => s.keyboardShortcutsOpen)
    const setKeyboardShortcutsOpen = useGraphGeneralSettingsStore(s => s.setKeyboardShortcutsOpen)

    const isMac = isMacOS()
    const modKey = isMac ? "⌘" : "Ctrl"

    const shortcuts = [
        {
            category: "Navigation & Panels",
            items: [
                { key: `${modKey}+L`, description: "Toggle Analysis Panel" },
                { key: `${modKey}+B`, description: "Toggle Panel" },
                { key: `${modKey}+D`, description: "Toggle Console" },
                { key: `${modKey}+J`, description: "Open Command Palette" },
            ]
        },
        {
            category: "Chat & Assistant",
            items: [
                { key: `${modKey}+E`, description: "Toggle Chat Assistant" },
                { key: "Escape", description: "Close Chat Assistant" },
            ]
        },
        {
            category: "File Operations",
            items: [
                { key: `${modKey}+S`, description: "Save (Analysis/Flow)" },
            ]
        }
    ]

    return (
        <Dialog open={keyboardShortcutsOpen} onOpenChange={setKeyboardShortcutsOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Keyboard Shortcuts</DialogTitle>
                    <DialogDescription>
                        Here is the list of all available keyboard shortcuts.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    {shortcuts.map((category) => (
                        <div key={category.category} className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                                {category.category}
                            </h3>
                            <div className="space-y-2">
                                {category.items.map((item) => (
                                    <div key={item.key} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                                        <span className="text-sm text-muted-foreground">
                                            {item.description}
                                        </span>
                                        <kbd className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs font-mono font-medium text-foreground shadow-sm">
                                            {item.key}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}