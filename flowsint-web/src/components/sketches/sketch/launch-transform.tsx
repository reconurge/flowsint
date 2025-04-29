"use client"

import { useState } from "react"
import { useLaunchSan } from "@/hooks/use-launch-scan"
import { useTransforms } from "@/hooks/use-transforms"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useLaunchTransform } from "@/hooks/use-launch-transform"
import { formatDistanceToNow } from "date-fns"

interface Transform {
    id: string
    name: string
    description: string
    category: string
    created_at: string
    last_updated_at: string
}

const LaunchTransform = ({ values, type, sketch_id }: { values: string[], type: string, sketch_id: string }) => {
    const { launchTransform } = useLaunchTransform()
    const { data: transforms, isLoading } = useTransforms(type)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedTransform, setSelectedTransform] = useState<Transform | null>(null)

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
                className="relative min-w-[80px] h-8 overflow-hidden truncate bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 px-6 py-2 text-white border-none font-medium rounded-full"
            >
                <span className="flex items-center gap-2">
                    <Sparkles className={"h-4 w-4 transition-transform duration-300"} />
                    <span>Search</span>
                </span>
                <span className="absolute inset-0 bg-black opacity-0 hover:opacity-10 transition-opacity duration-300" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Select a Transform</DialogTitle>
                        <DialogDescription>Choose a transform to launch from the list below.</DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <RadioGroup value={selectedTransform?.id} className="space-y-3">
                            {transforms?.map((transform: Transform) => (
                                <Card
                                    key={transform.id}
                                    className={`cursor-pointer border transition-all ${selectedTransform?.id === transform.id ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                                    onClick={() => handleSelectTransform(transform)}
                                >
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex items-start space-x-3">
                                            <RadioGroupItem value={transform.id} id={transform.id} className="mt-1" />
                                            <div className="flex-1">
                                                <Label htmlFor={transform.id} className="cursor-pointer">
                                                    <CardTitle className="text-base">{transform.name}</CardTitle>
                                                    {transform.description && (
                                                        <CardDescription className="text-sm mt-1">
                                                            {transform.description || "No description available"}
                                                        </CardDescription>
                                                    )}
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                        <div>Created: {formatDistanceToNow(transform.created_at, { addSuffix: true })}</div>
                                                        <div>Last updated: {formatDistanceToNow(transform.last_updated_at, { addSuffix: true })}</div>
                                                    </div>
                                                </Label>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))}
                        </RadioGroup>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseModal} className="mr-2">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleLaunchTransform}
                            disabled={!selectedTransform}
                            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
                        >
                            Launch Transform
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default LaunchTransform
