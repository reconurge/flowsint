import { useFlowStore } from '@/stores/flow-store'
import { DialogHeader, DialogFooter, Dialog, DialogContent, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { useCallback, useState, useEffect } from 'react'
import { EnricherParamSchemaItem } from '@/types'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import KeySelector from '../keys/key-select'
import { type Key } from '@/types/key'
import { useQuery } from '@tanstack/react-query'
import { KeyService } from '@/api/key-service'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { MemoizedMarkdown } from '../chat/memoized-markdown'
import { cn } from '@/lib/utils'

const ParamsDialog = () => {
  const openParamsDialog = useFlowStore((s) => s.openParamsDialog)
  const setOpenParamsDialog = useFlowStore((s) => s.setOpenParamsDialog)
  const selectedNode = useFlowStore((s) => s.selectedNode)
  const updateNode = useFlowStore((s) => s.updateNode)
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
    queryFn: () => KeyService.get()
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
      <DialogContent className="!w-[90vw] !max-w-[900px] h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Configure <span className="text-primary">{selectedNode.data.class_name}</span>
          </DialogTitle>
          <div className={cn('justify-start', 'flex w-full')}>
            <div className={cn('w-full', 'p-3 rounded-xl max-w-full', 'flex flex-col gap-2')}>
              <div className="max-w-none">{selectedNode?.data.description?.toString()}</div>
            </div>
          </div>
        </DialogHeader>
        <Tabs defaultValue="parameters" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="documentation">Documentation</TabsTrigger>
          </TabsList>
          <TabsContent value="parameters" className="space-y-4 mt-4">
            <div className="grid gap-4">
              {selectedNode?.data?.params_schema?.map((param: EnricherParamSchemaItem) => (
                <div className="space-y-2" key={param.name}>
                  <div className="flex items-start flex-col">
                    <Label htmlFor={param.name} className="text-sm font-medium">
                      {param.name}
                      {param.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <p className="text-sm opacity-60">{param.description}</p>
                  </div>
                  {param.type === 'vaultSecret' ? (
                    <KeySelector
                      onChange={(key) => setParams({ ...params, [param.name]: key.id })}
                      value={keys.find((key) => key.id === params[param.name])}
                    />
                  ) : (
                    <Input
                      id={param.name}
                      type={param.type}
                      placeholder={param.default ?? param.name}
                      value={params[param.name] || ''}
                      onChange={(e) => setParams({ ...params, [param.name]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="documentation" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className={cn('w-full', 'p-3 rounded-xl max-w-full', 'flex flex-col gap-2')}>
                <MemoizedMarkdown
                  id={selectedNode.id}
                  content={selectedNode?.data.documentation?.toString() ?? ''}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-auto">
          <Button variant="outline" onClick={() => setOpenParamsDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ParamsDialog
