import { Button } from '@/components/ui/button'
import { ResizablePanel } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ChevronDown, ChevronRight, Globe, Mail, MapPin, Phone, User, Wifi } from 'lucide-react'

interface LeftPanelProps {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
}

export function LeftPanel({ isCollapsed, setIsCollapsed }: LeftPanelProps) {
    // Sample entity categories for the left panel
    const entityCategories = [
        {
            name: "Infrastructure",
            entities: [
                { name: "Domain", icon: <Globe className="h-4 w-4" /> },
                { name: "IP Address", icon: <Wifi className="h-4 w-4" /> },
                { name: "Website", icon: <Globe className="h-4 w-4" /> },
            ],
        },
        {
            name: "Personal",
            entities: [
                { name: "Person", icon: <User className="h-4 w-4" /> },
                { name: "Email Address", icon: <Mail className="h-4 w-4" /> },
                { name: "Phone Number", icon: <Phone className="h-4 w-4" /> },
                { name: "Location", icon: <MapPin className="h-4 w-4" /> },
            ],
        },
    ]

    return (
        <ResizablePanel
            defaultSize={15}
            minSize={10}
            maxSize={25}
            className="h-full bg-card"
            collapsible={true}
            collapsedSize={4}
            onCollapse={() => setIsCollapsed(true)}
            onExpand={() => setIsCollapsed(false)}
        >
            {!isCollapsed ? (
                <div className="flex h-full flex-col">
                    <div className="flex h-8 items-center justify-between border-b px-4 bg-card">
                        <h2 className="font-medium text-sm">Palette</h2>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2">
                            <Accordion type="multiple" defaultValue={["Infrastructure", "Personal"]}>
                                {entityCategories.map((category) => (
                                    <AccordionItem
                                        key={category.name}
                                        value={category.name}
                                        className="border-b border-border"
                                    >
                                        <AccordionTrigger className="py-2 text-sm">{category.name}</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="grid grid-cols-1 gap-1">
                                                {category.entities.map((entity) => (
                                                    <div
                                                        key={entity.name}
                                                        className="flex cursor-grab items-center gap-2 rounded-md p-2 hover:bg-muted"
                                                        draggable="true"
                                                    >
                                                        {entity.icon}
                                                        <span className="text-xs">{entity.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </ScrollArea>
                </div>
            ) : (
                <div className="flex h-full items-center justify-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsCollapsed(false)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </ResizablePanel>
    )
}