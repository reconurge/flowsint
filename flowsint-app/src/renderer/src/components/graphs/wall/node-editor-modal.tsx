import React, { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Edit3, Save, X, Hash, Type, FileText, Tag, Check } from "lucide-react"
import type { NodeData } from "@/types"
import { useGraphStore } from "@/stores/graph-store"
import { MapFromAddress } from "../map"

export const NodeEditorModal: React.FC = () => {
    const currentNode = useGraphStore(state => state.currentNode)
    const openNodeEditorModal = useGraphStore(state => state.openNodeEditorModal)
    const setOpenNodeEditorModal = useGraphStore(state => state.setOpenNodeEditorModal)
    const updateNode = useGraphStore(state => state.updateNode)
    const setCurrentNode = useGraphStore(state => state.setCurrentNode)

    const [formData, setFormData] = useState<Partial<NodeData>>({
        label: "",
        caption: "",
        type: ""
    });

    // Update form data when currentNode changes
    useEffect(() => {
        if (currentNode) {
            setFormData({
                ...currentNode.data,
                label: currentNode.data.label || "",
                caption: currentNode.data.caption || "",
                type: currentNode.data.type || ""
            });
        }
    }, [currentNode]);

    const handleSave = () => {
        if (currentNode) {
            updateNode(currentNode.id, formData);
            setCurrentNode({
                ...currentNode,
                data: {
                    ...currentNode.data,
                    ...formData
                }
            });
            setOpenNodeEditorModal(false);
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

    if (!currentNode) return null;

    // Separate core fields from additional properties
    const coreFields = ["label", "caption", "type", "id"];
    const additionalFields = Object.entries(currentNode.data).filter(
        ([key]) => !coreFields.includes(key) && key !== 'ID'
    );

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
                        <div className="space-y-6 pb-6">
                            {/* Description */}
                            {currentNode.data.description && (
                                <Card className="border bg-card/50">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base font-medium">
                                            Description
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div
                                            className="text-sm text-muted-foreground prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: currentNode.data.description }}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Core Properties Card */}
                            <Card className="border bg-card/50">
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center gap-2 text-base font-medium">
                                        <Tag className="h-4 w-4 text-muted-foreground" />
                                        Core Properties
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="label" className="text-sm font-medium flex items-center gap-2">
                                                <FileText className="h-3 w-3" />
                                                Label
                                            </Label>
                                            <Input
                                                id="label"
                                                value={formData.label || ""}
                                                onChange={(e) => handleInputChange("label", e.target.value)}
                                                placeholder="Enter node label"
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="type" className="text-sm font-medium flex items-center gap-2">
                                                <Type className="h-3 w-3" />
                                                Type
                                            </Label>
                                            <Input
                                                id="type"
                                                value={formData.type || ""}
                                                onChange={(e) => handleInputChange("type", e.target.value)}
                                                placeholder="Enter node type"
                                                className="h-9"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="caption" className="text-sm font-medium flex items-center gap-2">
                                            <FileText className="h-3 w-3" />
                                            Caption
                                        </Label>
                                        <Input
                                            id="caption"
                                            value={formData.caption || ""}
                                            onChange={(e) => handleInputChange("caption", e.target.value)}
                                            placeholder="Enter node caption"
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="id" className="text-sm font-medium flex items-center gap-2">
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
                                </CardContent>
                            </Card>

                            {/* Additional Properties */}
                            {additionalFields.length > 0 && (
                                <Card className="border bg-card/50">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base font-medium">
                                            Additional Properties
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Custom properties for this node
                                        </p>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {additionalFields.map(([key, value]) => (
                                                <div key={key} className="space-y-2">
                                                    <Label
                                                        htmlFor={key}
                                                        className="text-sm font-medium capitalize"
                                                    >
                                                        {key.replace(/_/g, ' ')}
                                                    </Label>
                                                    {typeof value === "boolean" ? (
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
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Node Preview */}
                            <Card className="border bg-muted/30">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-medium">
                                        Preview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="p-4 rounded-lg bg-background border">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-primary/60"></div>
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">
                                                    {formData.label || "No label"}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formData.type || "No type"} • {formData.caption || "No caption"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {formData.type === "location" && <Card className="border bg-muted/30">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-medium">
                                        Location
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-hidden rounded-lg bg-background border">
                                        <MapFromAddress address={formData.label as string} />
                                    </div>
                                </CardContent>
                            </Card>}
                        </div>
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
                                    onClick={handleCancel}
                                    className="gap-2"
                                >
                                    <X className="h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    className="gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    );
}; 