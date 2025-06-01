"use client"

import * as React from "react"
import {
    Calculator,
    Calendar,
    CreditCard,
    Fingerprint,
    Search,
    Settings,
    Smile,
    User,
    Workflow,
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut"
import { Button } from "./ui/button"
import { Link } from "@tanstack/react-router"

export function Command() {
    const [open, setOpen] = React.useState(false)

    useKeyboardShortcut({
        key: "j",
        ctrlOrCmd: true,
        callback: () => {
            setOpen((prev) => !prev)
        },
    })
    return (
        <>
            <Button variant="ghost" onClick={() => setOpen(true)} className="text-xs h-8 w-full max-w-3xs border flex items-center justify-between hover:border-muted-foreground text-muted-foreground">
                <span className="flex items-center gap-2"><Search /> Search Flowsint{" "}</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>J
                </kbd>
            </Button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                        <CommandItem asChild>
                            <Link onClick={() => setOpen(false)} to="/dashboard/investigations">
                                <Fingerprint />
                                <span>Investigations</span>
                            </Link>
                        </CommandItem>
                        <CommandItem asChild>
                            <Link onClick={() => setOpen(false)} to="/dashboard/transforms">

                                <Workflow />
                                <span>Transforms</span>
                            </Link>
                        </CommandItem>
                    </CommandGroup>
                    {/* <CommandSeparator />
                    <CommandGroup heading="Settings">
                        <CommandItem>
                            <User />
                            <span>Profile</span>
                            <CommandShortcut>⌘P</CommandShortcut>
                        </CommandItem>
                        <CommandItem>
                            <CreditCard />
                            <span>Billing</span>
                            <CommandShortcut>⌘B</CommandShortcut>
                        </CommandItem>
                        <CommandItem>
                            <Settings />
                            <span>Settings</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                    </CommandGroup> */}
                </CommandList>
            </CommandDialog>
        </>
    )
}
