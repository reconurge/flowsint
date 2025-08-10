import React, { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Edit3, Save, X, Hash, Type, FileText, Check, Loader2 } from "lucide-react"
import type { NodeData } from "@/types"
import { useGraphStore } from "@/stores/graph-store"
import { MapFromAddress } from "../../map/map"
import { sketchService } from "@/api/sketch-service"
import { useParams } from "@tanstack/react-router"
import { toast } from "sonner"
import NeighborsGraph from "./neighbors"
import { DraggableCard } from "../draggable-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useNodeEditorLayoutStore, type CardType } from "@/stores/node-editor-layout-store"
import { Reorder } from "framer-motion"
import { useIcon } from "@/hooks/use-icon"

export const NodeEditorModal: React.FC = () => {
    const currentNode = useGraphStore(state => state.currentNode)
    const openNodeEditorModal = useGraphStore(state => state.openNodeEditorModal)
    const setOpenNodeEditorModal = useGraphStore(state => state.setOpenNodeEditorModal)
    const updateNode = useGraphStore(state => state.updateNode)
    const setCurrentNode = useGraphStore(state => state.setCurrentNode)
    const { id: sketchId } = useParams({ strict: false })
    const cardLayout = useNodeEditorLayoutStore(s => s.cardLayout)
    const setCardLayout = useNodeEditorLayoutStore(s => s.setCardLayout)
    const toggleCardEdit = useNodeEditorLayoutStore(s => s.toggleCardEdit)
    const setCardEditState = useNodeEditorLayoutStore(s => s.setCardEditState)
    const resetLayout = useNodeEditorLayoutStore(s => s.resetLayout)
    const IconComponent = useIcon(currentNode?.data.type as string, currentNode?.data?.src as string | null);

    const [formData, setFormData] = useState<Partial<NodeData>>({
        label: "",
        caption: "",
        type: ""
    });

    const [isSaving, setIsSaving] = useState(false);

    // Update form data when currentNode changes
    useEffect(() => {
        if (currentNode) {
            setFormData({
                ...currentNode.data,
                label: currentNode.data.label || "",
                caption: currentNode.data.caption || "",
                type: currentNode.data.type || ""
            });
            // Reset edit states when node changes
            cardLayout.forEach(card => {
                if (card.isEditing) {
                    setCardEditState(card.id, false)
                }
            })
        }
    }, [currentNode]);

    const handleSave = async () => {
        if (!currentNode || !sketchId) return;

        setIsSaving(true);

        try {
            // Prepare the data for the API
            const updateData = {
                nodeId: currentNode.id,
                data: formData
            };

            // Call the API to update the node
            const result = await sketchService.updateNode(sketchId, JSON.stringify(updateData));

            if (result.status === "node updated") {
                // Update the local store
                updateNode(currentNode.id, formData);
                setCurrentNode({
                    ...currentNode,
                    data: {
                        ...currentNode.data,
                        ...formData
                    }
                });

                toast.success("Node updated successfully");
                setOpenNodeEditorModal(false);
            } else {
                toast.error("Failed to update node");
            }
        } catch (error) {
            console.error("Error updating node:", error);
            toast.error("Failed to update node. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setOpenNodeEditorModal(false);
    };

    const handleInputChange = (field: keyof NodeData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleLayoutReorder = (newOrder: string[]) => {
        const updatedLayout = newOrder.map((id, index) => {
            const existingCard = cardLayout.find(card => card.id === id)
            return existingCard ? { ...existingCard, order: index } : cardLayout[index]
        })
        setCardLayout(updatedLayout)
    }

    const isLocation = currentNode?.data.type === "location" || (currentNode?.data.latitude && currentNode?.data.longitude)

    if (!currentNode) return null;

    // Separate core fields from additional properties
    const coreFields = ["label", "caption", "type", "id"];
    const additionalFields = Object.entries(currentNode.data).filter(
        ([key]) => !coreFields.includes(key) && key !== 'ID'
    );

    // Sort cards by their order
    const sortedCards = [...cardLayout].sort((a, b) => a.order - b.order)

    const renderCardContent = (cardId: CardType) => {
        const isEditing = cardLayout.find(card => card.id === cardId)?.isEditing || false

        switch (cardId) {
            case 'description':
                if (!currentNode.data.description) return null
                return (
                    <div
                        className="text-sm text-muted-foreground prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: currentNode.data.description }}
                    />
                )

            case 'core-properties':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="label" className="text-sm opacity-60 font-medium flex items-center gap-2">
                                    <FileText className="h-3 w-3" />
                                    Label
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="label"
                                        value={formData.label || ""}
                                        onChange={(e) => handleInputChange("label", e.target.value)}
                                        placeholder="Enter node label"
                                        className="h-9"
                                    />
                                ) : (
                                    <div className="h-9 px-3 py-2 text-sm bg-muted/30 border rounded-md flex items-center">
                                        <span className="text-foreground">{formData.label || "No label"}</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type" className="text-sm opacity-60 font-medium flex items-center gap-2">
                                    <Type className="h-3 w-3" />
                                    Type
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="type"
                                        value={formData.type || ""}
                                        onChange={(e) => handleInputChange("type", e.target.value)}
                                        placeholder="Enter node type"
                                        className="h-9"
                                    />
                                ) : (
                                    <div className="h-9 px-3 py-2 text-sm bg-muted/30 border rounded-md flex items-center">
                                        <span className="text-foreground">{formData.type || "No type"}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="caption" className="text-sm opacity-60 font-medium flex items-center gap-2">
                                <FileText className="h-3 w-3" />
                                Caption
                            </Label>
                            {isEditing ? (
                                <Input
                                    id="caption"
                                    value={formData.caption || ""}
                                    onChange={(e) => handleInputChange("caption", e.target.value)}
                                    placeholder="Enter node caption"
                                    className="h-9"
                                />
                            ) : (
                                <div className="h-9 px-3 py-2 text-sm bg-muted/30 border rounded-md flex items-center">
                                    <span className="text-foreground">{formData.caption || "No caption"}</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="id" className="text-sm opacity-60 font-medium flex items-center gap-2">
                                <Hash className="h-3 w-3" />
                                ID
                            </Label>
                            <Input
                                id="id"
                                value={formData.id || ""}
                                onChange={(e) => handleInputChange("id", e.target.value)}
                                className="h-9 bg-muted/50"
                                disabled
                            />
                        </div>
                    </div>
                )

            case 'additional-properties':
                if (additionalFields.length === 0) return null
                return (
                    <div className="space-y-4">
                        {additionalFields.map(([key, value]) => (
                            <div key={key} className="space-y-2">
                                <Label
                                    htmlFor={key}
                                    className="text-sm opacity-60 font-medium capitalize"
                                >
                                    {key.replace(/_/g, ' ')}
                                </Label>
                                {isEditing ? (
                                    typeof value === "boolean" ? (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant={formData[key as keyof NodeData] ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => handleInputChange(key as keyof NodeData, (!formData[key as keyof NodeData]).toString())}
                                                className="gap-2"
                                            >
                                                {formData[key as keyof NodeData] ? (
                                                    <>
                                                        <Check className="h-3 w-3" />
                                                        True
                                                    </>
                                                ) : (
                                                    "False"
                                                )}
                                            </Button>
                                        </div>
                                    ) : typeof value === "string" && value.length > 100 ? (
                                        <Textarea
                                            id={key}
                                            value={formData[key as keyof NodeData] as string || ""}
                                            onChange={(e) => handleInputChange(key as keyof NodeData, e.target.value)}
                                            placeholder={`Enter ${key.replace(/_/g, ' ').toLowerCase()}`}
                                            className="min-h-[80px] resize-none"
                                            rows={3}
                                        />
                                    ) : (
                                        <Input
                                            id={key}
                                            value={formData[key as keyof NodeData] as string || ""}
                                            onChange={(e) => handleInputChange(key as keyof NodeData, e.target.value)}
                                            placeholder={`Enter ${key.replace(/_/g, ' ').toLowerCase()}`}
                                            className="h-9"
                                        />
                                    )
                                ) : (
                                    <div className="h-9 px-3 py-2 text-sm bg-muted/30 border rounded-md flex items-center">
                                        <span className="text-foreground">
                                            {typeof value === "boolean"
                                                ? (value ? "True" : "False")
                                                : String(value || "No value")
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )

            case 'preview':
                return (
                    <div className="p-4 rounded-lg bg-background border">
                        <div className="flex items-center gap-4">
                            {/* Large Profile Image/Icon */}
                            <div className="relative flex-shrink-0">
                                {currentNode.data.src ? (
                                    <Avatar className="rounded-lg h-20 w-20 border-2 border-muted">
                                        <AvatarImage className="rounded-lg object-cover" src={currentNode.data.src} />
                                        <AvatarFallback className="text-lg font-semibold rounded-lg">
                                            {formData.label?.[0]?.toUpperCase() || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <div className="h-30 w-30 rounded-lg border-2 border-muted bg-muted/30 flex items-center justify-center">
                                        <IconComponent className="h-15 w-15 text-muted-foreground" />
                                    </div>
                                )}
                            </div>

                            {/* Main Information */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-foreground mb-1">
                                    {formData.label || "No label"}
                                </h3>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-primary">
                                        {formData.type || "No type"}
                                    </p>
                                    {formData.caption && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {formData.caption}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )

            case 'neighbors':
                return <NeighborsGraph sketchId={sketchId as string} nodeId={currentNode.id as string} />

            case 'location':
                return (
                    <div className="overflow-hidden rounded-lg bg-background border">
                        {isLocation ? (
                            <MapFromAddress
                                locations={[
                                    {
                                        lat: formData.latitude,
                                        lon: formData.longitude,
                                        address: formData.label as string,
                                        label: formData.label as string
                                    }
                                ]}
                            />
                        ) : (
                            <div className="p-4 text-center text-muted-foreground">
                                <p>No location data available for this node.</p>
                            </div>
                        )}
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <Sheet open={openNodeEditorModal} onOpenChange={setOpenNodeEditorModal}>
            <SheetContent className="!w-full !max-w-4xl h-full !duration-100 p-0 flex flex-col h-full">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <SheetHeader className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Edit3 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex gap-3">
                                <SheetTitle className="text-lg font-semibold">
                                    Edit Node Properties
                                </SheetTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {currentNode.data.label || currentNode.id}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                    {currentNode.data.type || "Unknown Type"}
                                </Badge>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Content */}
                    <div className="flex-1 px-6 py-6 grow overflow-y-auto">
                        <Reorder.Group
                            axis="y"
                            values={sortedCards.map(card => card.id)}
                            onReorder={handleLayoutReorder}
                            on
                            layoutScroll
                            className="space-y-6 pb-6"
                        >
                            {sortedCards.map((card) => {
                                const cardContent = renderCardContent(card.id)
                                if (!cardContent) return null

                                return (
                                    <DraggableCard
                                        key={card.id}
                                        id={card.id}
                                        title={card.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        isEditing={card.isEditing}
                                        onToggleEdit={() => toggleCardEdit(card.id)}
                                        showEditButton={card.id !== 'neighbors' && card.id !== 'location'}
                                        description={
                                            card.id === 'core-properties' ? 'Basic node information' :
                                                card.id === 'additional-properties' ? 'Custom properties for this node' :
                                                    card.id === 'preview' ? 'How this node appears in the graph' :
                                                        card.id === 'neighbors' ? 'Connected nodes and relationships' :
                                                            card.id === 'location' ? 'Geographic location data' :
                                                                undefined
                                        }
                                    >
                                        {cardContent}
                                    </DraggableCard>
                                )
                            })}
                        </Reorder.Group>
                    </div>

                    {/* Footer */}
                    <SheetFooter className="px-6 py-4 border-t bg-muted/30 flex-shrink-0">
                        <div className="flex justify-between items-center w-full">
                            <div className="text-sm text-muted-foreground">
                                {additionalFields.length} additional properties
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={resetLayout}
                                    className="gap-2"
                                >
                                    Reset Layout
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    className="gap-2"
                                >
                                    <X className="h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="gap-2"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </div>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    );
}; 