import { useTransformStore } from '@/stores/transform-store'
import { DialogHeader, DialogFooter, Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog'
import { Button } from '../ui/button'
import { useCallback, useState, useEffect } from 'react'
import { ScannerParamSchemaItem } from '@/types'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import KeySelector from '../keys/key-select'
import { type Key } from '@/types/key'
import { useQuery } from "@tanstack/react-query"
import { KeyService } from "@/api/key-service"
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { MemoizedMarkdown } from '../chat/memoized-markdown'
import { cn } from '@/lib/utils'

const ParamsDialog = () => {
    const openParamsDialog = useTransformStore(s => s.openParamsDialog)
    const setOpenParamsDialog = useTransformStore(s => s.setOpenParamsDialog)
    const selectedNode = useTransformStore(s => s.selectedNode)
    const updateNode = useTransformStore(s => s.updateNode)
    const [params, setParams] = useState<Record<string, string>>({})
    const [settings, setSettings] = useState<Record<string, string>>({
        duration: '30',
        retry: '3',
        timeout: '60',
        priority: 'medium'
    })

    // Initialize params and settings when selectedNode changes
    useEffect(() => {
        if (selectedNode?.data.params) {
            setParams(selectedNode.data.params)
        }
        if (selectedNode?.data.settings) {
            setSettings({ ...settings, ...selectedNode.data.settings })
        }
    }, [selectedNode])

    // Fetch keys to convert between IDs and Key objects
    const { data: keys = [] } = useQuery<Key[]>({
        queryKey: ['keys'],
        queryFn: () => KeyService.get(),
    })

    const handleSave = useCallback(async () => {
        if (!selectedNode) return
        const updatedNode = {
            ...selectedNode,
            data: {
                ...selectedNode.data,
                params,
                settings
            }
        }
        updateNode(updatedNode)
        setOpenParamsDialog(false)
    }, [selectedNode, updateNode, params, settings, setOpenParamsDialog])

    if (!selectedNode) return

    return (
        <Dialog open={openParamsDialog} onOpenChange={setOpenParamsDialog}>
            <DialogContent className="sm:max-w-[725px]">
                <DialogHeader>
                    <DialogTitle>Configure <span className="text-primary">{selectedNode.data.class_name}</span></DialogTitle>
                    {/* <DialogDescription className='break-words w-full'> */}
                    <div className={cn("justify-start",
                        "flex w-full",
                    )}>
                        <div className={cn("w-full",
                            "p-3 rounded-xl max-w-full",
                            "flex flex-col gap-2"
                        )}>
                            <MemoizedMarkdown id={selectedNode.id} content={selectedNode?.data.doc?.toString() ?? ""} />
                        </div>
                    </div>
                </DialogHeader>
                <Tabs defaultValue="parameters" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="parameters">Parameters</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="parameters" className="space-y-4 mt-4">
                        <div className="grid gap-4">
                            {selectedNode?.data?.params_schema?.map((param: ScannerParamSchemaItem) => (
                                <div className="space-y-2" key={param.name}>
                                    <div className="flex items-start flex-col">
                                        <Label htmlFor={param.name} className="text-sm font-medium">
                                            {param.name}
                                            {param.required && <span className="text-destructive ml-1">*</span>}
                                        </Label>
                                        <p className='text-sm opacity-60'>{param.description}</p>
                                    </div>
                                    {param.type === 'vaultSecret' ? (
                                        <KeySelector
                                            onChange={(key) => setParams({ ...params, [param.name]: key.id })}
                                            value={keys.find(key => key.id === params[param.name])}
                                        />
                                    ) : (
                                        <Input
                                            id={param.name}
                                            type={param.type}
                                            placeholder={param.default ?? param.name}
                                            value={params[param.name] || ""}
                                            onChange={(e) => setParams({ ...params, [param.name]: e.target.value })}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4 mt-4">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <div className="flex items-start flex-col">
                                    <Label htmlFor="duration" className="text-sm font-medium">
                                        Duration (seconds)
                                    </Label>
                                    <p className='text-sm opacity-60'>Maximum execution time for this transform</p>
                                </div>
                                <Input
                                    id="duration"
                                    type="number"
                                    placeholder="30"
                                    value={settings.duration || ""}
                                    onChange={(e) => setSettings({ ...settings, duration: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-start flex-col">
                                    <Label htmlFor="retry" className="text-sm font-medium">
                                        Retry Attempts
                                    </Label>
                                    <p className='text-sm opacity-60'>Number of retry attempts on failure</p>
                                </div>
                                <Input
                                    id="retry"
                                    type="number"
                                    placeholder="3"
                                    value={settings.retry || ""}
                                    onChange={(e) => setSettings({ ...settings, retry: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-start flex-col">
                                    <Label htmlFor="timeout" className="text-sm font-medium">
                                        Timeout (seconds)
                                    </Label>
                                    <p className='text-sm opacity-60'>Connection timeout for network requests</p>
                                </div>
                                <Input
                                    id="timeout"
                                    type="number"
                                    placeholder="60"
                                    value={settings.timeout || ""}
                                    onChange={(e) => setSettings({ ...settings, timeout: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-start flex-col">
                                    <Label htmlFor="priority" className="text-sm font-medium">
                                        Priority
                                    </Label>
                                    <p className='text-sm opacity-60'>Execution priority level</p>
                                </div>
                                <select
                                    id="priority"
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={settings.priority || "medium"}
                                    onChange={(e) => setSettings({ ...settings, priority: e.target.value })}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenParamsDialog(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}

export default ParamsDialog