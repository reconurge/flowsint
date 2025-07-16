"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useLaunchTransform } from "@/hooks/use-launch-transform"
import { formatDistanceToNow } from "date-fns"
import { useQuery } from "@tanstack/react-query"
import { transformService } from "@/api/transfrom-service"
import { useParams } from "@tanstack/react-router"
import { capitalizeFirstLetter } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface Transform {
    id: string
    name: string
    description: string
    category: string
    created_at: string
    last_updated_at: string
}

const LaunchTransform = ({ values, type, children }: { values: string[], type: string, children?: React.ReactNode }) => {
    const { launchTransform } = useLaunchTransform()
    const { id: sketch_id } = useParams({ strict: false })
    const [isOpen, setIsOpen] = useState(false)
    const [selectedTransform, setSelectedTransform] = useState<Transform | null>(null)

    const { data: transforms, isLoading } = useQuery({
        queryKey: ["transforms", type],
        queryFn: () => transformService.get(capitalizeFirstLetter(type)),
        // queryFn: () => transformService.get(),
    });

    const handleCloseModal = useCallback(() => {
        setIsOpen(false)
    }, [])

    const handleSelectTransform = useCallback((transform: Transform) => {
        setSelectedTransform(transform)
    }, [])

    const handleLaunchTransform = useCallback(() => {
        if (selectedTransform) {
            launchTransform(values, selectedTransform.id, sketch_id)
            handleCloseModal()
        }
    }, [selectedTransform, launchTransform, values, sketch_id])

    return (
        <div>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <div>{children}</div>
                </SheetTrigger>
                <SheetContent className="sm:max-w-xl">
                    <SheetHeader>
                        <SheetTitle>Select a transform</SheetTitle>
                        <SheetDescription>Choose a transform to launch from the list below.</SheetDescription>
                    </SheetHeader>

                    <div className="p-4 grow overflow-auto">
                        <RadioGroup value={selectedTransform?.id} className="space-y-3">
                            {isLoading ? (
                                // Skeleton loading state
                                Array.from({ length: 3 }).map((_, index) => (
                                    <Card key={index} className="border py-1">
                                        <CardHeader className="p-4">
                                            <div className="flex flex-col space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-4 w-4 rounded-full" />
                                                    <Skeleton className="h-5 w-32" />
                                                </div>
                                                <div className="pl-7 space-y-2">
                                                    <Skeleton className="h-4 w-full" />
                                                    <Skeleton className="h-4 w-3/4" />
                                                </div>
                                                <div className="flex flex-col space-y-1 pl-7">
                                                    <Skeleton className="h-3 w-24" />
                                                    <Skeleton className="h-3 w-20" />
                                                </div>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ))
                            ) : (
                                transforms?.map((transform: Transform) => (
                                    <Card
                                        key={transform.id}
                                        className={`cursor-pointer border py-1 transition-all ${selectedTransform?.id === transform.id
                                            ? "border-primary bg-primary/5"
                                            : "hover:border-primary/50"
                                            }`}
                                        onClick={() => handleSelectTransform(transform)}
                                    >
                                        <CardHeader className="p-4">
                                            <div className="flex flex-col space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <RadioGroupItem value={transform.id} id={transform.id} />
                                                    <CardTitle className="text-base">{transform.name}</CardTitle>
                                                </div>

                                                {transform.description && (
                                                    <CardDescription className="text-sm pl-7">
                                                        {transform.description || "No description available"}
                                                    </CardDescription>
                                                )}

                                                <div className="flex flex-col space-y-1 text-xs text-muted-foreground pl-7">
                                                    <div>Created {formatDistanceToNow(transform.created_at, { addSuffix: true })}</div>
                                                    <div>Updated {formatDistanceToNow(transform.last_updated_at, { addSuffix: true })}</div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ))
                            )}
                        </RadioGroup>
                    </div>

                    <SheetFooter>
                        <Button variant="outline" onClick={handleCloseModal} className="mr-2">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleLaunchTransform}
                            disabled={!selectedTransform}
                            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
                        >
                            Launch transform
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}

export default LaunchTransform
