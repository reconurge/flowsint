"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useLaunchTransform } from "@/hooks/use-launch-transform"
import { formatDistanceToNow } from "date-fns"
import { useQuery } from "@tanstack/react-query"
import { transformService } from "@/api/transfrom-service"
import { useParams } from "@tanstack/react-router"
import { capitalizeFirstLetter } from "@/lib/utils"

interface Transform {
    id: string
    name: string
    description: string
    category: string
    created_at: string
    last_updated_at: string
}

const LaunchTransform = ({ values, type }: { values: string[], type: string }) => {
    const { launchTransform } = useLaunchTransform()
    const { id: sketch_id } = useParams({ strict: false })
    const [isOpen, setIsOpen] = useState(false)
    const [selectedTransform, setSelectedTransform] = useState<Transform | null>(null)

    const { data: transforms, isLoading } = useQuery({
        queryKey: ["transforms", type],
        queryFn: () => transformService.get(capitalizeFirstLetter(type)),
        // queryFn: () => transformService.get(),
    });


    const handleOpenModal = () => {
        setIsOpen(true)
    }

    const handleCloseModal = () => {
        setIsOpen(false)
    }

    const handleSelectTransform = (transform: Transform) => {
        setSelectedTransform(transform)
    }

    const handleLaunchTransform = () => {
        if (selectedTransform) {
            launchTransform(values, selectedTransform.id, sketch_id)
            handleCloseModal()
        }
    }

    return (
        <div>
            <Button
                onClick={handleOpenModal}
                disabled={isLoading || !transforms?.length}
                className="relative min-w-[80px] h-8 overflow-hidden truncate bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 px-4 py-2 text-white border-none font-medium rounded-full"
            >
                <span className="flex items-center gap-2">
                    <Sparkles className={"h-4 w-4 transition-transform duration-100"} />
                    <span>Search</span>
                </span>
            </Button>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent className="sm:max-w-xl">
                    <SheetHeader>
                        <SheetTitle>Select a transform</SheetTitle>
                        <SheetDescription>Choose a transform to launch from the list below.</SheetDescription>
                    </SheetHeader>

                    <div className="p-4 grow overflow-auto">
                        <RadioGroup value={selectedTransform?.id} className="space-y-3">
                            {transforms?.map((transform: Transform) => (
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
                            ))}
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
