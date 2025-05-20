"use client"

import type React from "react"

import { Dispatch, SetStateAction, useState } from "react"
import Image from "next/image"
import { Check, ChevronsUpDown, Loader2, UserCircle } from "lucide-react"
import { useQuery, useMutation } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { cn, getAvatarColor } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Profile } from "@/types"
import { clientFetch } from "@/lib/client-fetch"

interface AddInvestigationModalProps {
    sketchId: string
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
}

export function AddInvestigationModal({ sketchId, open, setOpen }: AddInvestigationModalProps) {
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
    const {
        data: profiles = [],
        isLoading,
        refetch,
    } = useQuery({
        queryKey: [process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API, "profiles",],
        queryFn: async () => {
            const data = await clientFetch(`${process.env.NEXT_PUBLIC_FLOWSINT_API}/profiles`)
            return data
        },
        enabled: false,
    })

    // Mutation for adding a profile to investigation
    const mutation = useMutation({
        mutationFn: async ({ profile_id, sketch_id }: { profile_id: string; sketch_id: string }) => {
            // TODO
        },
        onSuccess: () => {
            toast.success(`${selectedProfile?.first_name} ${selectedProfile?.last_name} a été ajouté à l'investigation`)
            setOpen(false)
        },
        onError: (e: { code: string }) => {
            return toast.error("An error occured. Try again later.")
        },
    })

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (newOpen) {
            refetch()
        } else {
            setSelectedProfile(null)
        }
    }

    const handleSubmit = () => {
        if (!selectedProfile) return

        mutation.mutate({
            profile_id: selectedProfile.id,
            sketch_id: sketchId,
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add a collaborator to the investigation</DialogTitle>
                    <DialogDescription>Select a profile to associate with this investigation's sketcH.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={popoverOpen}
                                className="w-full justify-between"
                                onClick={() => refetch()}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Loading profiles...</span>
                                    </div>
                                ) : selectedProfile ? (
                                    <div className="flex items-center gap-2">
                                        {selectedProfile.avatar_url ? (
                                            <Image
                                                src={selectedProfile.avatar_url || "/placeholder.svg"}
                                                alt={`${selectedProfile.first_name} ${selectedProfile.last_name}`}
                                                width={24}
                                                height={24}
                                                className="rounded-full"
                                            />
                                        ) : (
                                            <UserCircle className="h-5 w-5" />
                                        )}
                                        <span>
                                            {selectedProfile.first_name} {selectedProfile.last_name}
                                        </span>
                                    </div>
                                ) : (
                                    "Select a profile"
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                            <Command>
                                <CommandInput placeholder="Search for a profile..." />
                                <CommandList>
                                    <CommandEmpty>Could not find any profile.</CommandEmpty>
                                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                                        {profiles.map((profile: any) => (
                                            <CommandItem
                                                key={profile.id}
                                                value={`${profile.first_name} ${profile.last_name} ${profile.email}`}
                                                onSelect={() => {
                                                    setSelectedProfile(profile)
                                                    setPopoverOpen(false)
                                                }}
                                                className="flex items-center gap-2 py-2"
                                            >
                                                <div className="flex items-center gap-2 flex-1">
                                                    {/* {renderAvatar(profile)} */}
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {profile.first_name} {profile.last_name}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{profile.email}</span>
                                                    </div>
                                                </div>
                                                <Check
                                                    className={cn(
                                                        "ml-auto h-4 w-4",
                                                        selectedProfile?.id === profile.id ? "opacity-100" : "opacity-0",
                                                    )}
                                                />
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={!selectedProfile || mutation.isPending} className="w-full">
                        {mutation.isPending ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Adding...</span>
                            </div>
                        ) : (
                            "Add contributor"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const getInitials = (name: string) => {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
}

const renderAvatar = (user: any) => {
    const avatarColor = getAvatarColor(user.email)
    const avatar = (
        <Avatar
            key={user.id}
            className={cn(
                'h-10 w-10',
                "border-2 border-background bg-background",
                "transition-transform",
                "ring-0 ring-offset-0",
            )}
        >
            <AvatarImage src={user.image} alt={`${user.name}'s avatar`} />
            <AvatarFallback className={cn("text-xs text-white", avatarColor)}>{getInitials(user.name)}</AvatarFallback>
        </Avatar>

    )
    return avatar
}