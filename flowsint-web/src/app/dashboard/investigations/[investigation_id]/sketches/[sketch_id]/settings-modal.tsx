"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ITEM_TYPES, type ItemType, useNodesDisplaySettings } from "@/store/node-display-settings"
import { useModalStore } from "@/store/store-settings"

export default function SettingsModal() {
    const { isSettingsOpen, closeSettings } = useModalStore()
    const colors = useNodesDisplaySettings(s => s.colors)
    const setColor = useNodesDisplaySettings(s => s.setColor)
    const resetAll = useNodesDisplaySettings(s => s.resetAll)

    const [localColors, setLocalColors] = useState<Record<ItemType, string>>({ ...colors })

    const handleColorChange = (itemType: ItemType, color: string) => {
        setLocalColors((prev) => ({
            ...prev,
            [itemType]: color,
        }))
    }

    const handleSave = () => {
        // Update all colors in the store
        Object.entries(localColors).forEach(([itemType, color]) => {
            setColor(itemType as ItemType, color)
        })
        closeSettings()
    }

    const handleCancel = () => {
        // Reset local state to match store
        setLocalColors({ ...colors })
        closeSettings()
    }

    const handleReset = () => {
        resetAll()
        setLocalColors({ ...useNodesDisplaySettings.getState().colors })
    }

    return (
        <Dialog open={isSettingsOpen} onOpenChange={closeSettings}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Paramètres de Couleur</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="all" className="flex-1 overflow-hidden">
                    <TabsList className="grid grid-cols-2">
                        <TabsTrigger value="all">Tous les types</TabsTrigger>
                        <TabsTrigger value="grouped">Groupés</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all" className="flex-1 overflow-hidden p-3">
                        <ScrollArea className="h-[50vh] pr-4">
                            <div className="grid gap-4">
                                {ITEM_TYPES.map((itemType) => (
                                    <div key={itemType} className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <Label htmlFor={`color-${itemType}`} className="capitalize">
                                                {itemType.replace(/_/g, " ")}
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: localColors[itemType] }} /> */}
                                            <Input
                                                id={`color-${itemType}`}
                                                type="color"
                                                value={localColors[itemType]}
                                                onChange={(e) => handleColorChange(itemType, e.target.value)}
                                                className="p-0 overflow-hidden w-8 h-8 rounded-md border"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="grouped" className="flex-1 overflow-hidden p-3">
                        <ScrollArea className="h-[50vh] pr-4">
                            <div className="grid gap-6">
                                <div className="space-y-3">
                                    <h3 className="font-medium text-muted-foreground">Identité</h3>
                                    <div className="grid gap-2">
                                        {["individual", "organization", "credential", "biometric"].map((itemType) => (
                                            <div key={itemType} className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <Label htmlFor={`group-color-${itemType}`} className="capitalize">
                                                        {itemType.replace(/_/g, " ")}
                                                    </Label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {/* <div
                                                        className="w-8 h-8 rounded-md border"
                                                        style={{ backgroundColor: localColors[itemType as ItemType] }}
                                                    /> */}
                                                    <Input
                                                        id={`group-color-${itemType}`}
                                                        type="color"
                                                        value={localColors[itemType as ItemType]}
                                                        onChange={(e) => handleColorChange(itemType as ItemType, e.target.value)}
                                                        className="p-0 overflow-hidden w-8 h-8 rounded-md border"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="font-medium text-muted-foreground">Contact</h3>
                                    <div className="grid gap-2">
                                        {["phone", "address", "email", "social"].map((itemType) => (
                                            <div key={itemType} className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <Label htmlFor={`group-color-${itemType}`} className="capitalize">
                                                        {itemType.replace(/_/g, " ")}
                                                    </Label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {/* <div
                                                        className="w-8 h-8 rounded-md border"
                                                        style={{ backgroundColor: localColors[itemType as ItemType] }}
                                                    /> */}
                                                    <Input
                                                        id={`group-color-${itemType}`}
                                                        type="color"
                                                        value={localColors[itemType as ItemType]}
                                                        onChange={(e) => handleColorChange(itemType as ItemType, e.target.value)}
                                                        className="p-0 overflow-hidden w-8 h-8 rounded-md border"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="font-medium text-muted-foreground">Web</h3>
                                    <div className="grid gap-2">
                                        {["website", "domain", "subdomain", "ip", "online_activity", "digital_footprint"].map(
                                            (itemType) => (
                                                <div key={itemType} className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <Label htmlFor={`group-color-${itemType}`} className="capitalize">
                                                            {itemType.replace(/_/g, " ")}
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {/* <div
                                                            className="w-8 h-8 rounded-md border"
                                                            style={{ backgroundColor: localColors[itemType as ItemType] }}
                                                        /> */}
                                                        <Input
                                                            id={`group-color-${itemType}`}
                                                            type="color"
                                                            value={localColors[itemType as ItemType]}
                                                            onChange={(e) => handleColorChange(itemType as ItemType, e.target.value)}
                                                            className="p-0 overflow-hidden w-8 h-8 rounded-md border"
                                                        />
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="font-medium text-muted-foreground">Others</h3>
                                    <div className="grid gap-2">
                                        {["vehicle", "document", "financial", "event", "device", "media", "education", "relationship"].map(
                                            (itemType) => (
                                                <div key={itemType} className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <Label htmlFor={`group-color-${itemType}`} className="capitalize">
                                                            {itemType.replace(/_/g, " ")}
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {/* <div
                                                            className="w-8 h-8 rounded-md border"
                                                            style={{ backgroundColor: localColors[itemType as ItemType] }}
                                                        /> */}
                                                        <Input
                                                            id={`group-color-${itemType}`}
                                                            type="color"
                                                            value={localColors[itemType as ItemType]}
                                                            onChange={(e) => handleColorChange(itemType as ItemType, e.target.value)}
                                                            className="p-0 overflow-hidden w-8 h-8 rounded-md border"
                                                        />
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleReset}>
                        Réinitialiser
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleCancel}>
                            Annuler
                        </Button>
                        <Button onClick={handleSave}>Enregistrer</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
