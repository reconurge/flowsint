import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Edit3, Save, X, Hash, Type, FileText, Check, Loader2 } from 'lucide-react'
import type { NodeData } from '@/types'
import { useGraphStore } from '@/stores/graph-store'
import { MapFromAddress } from '../../map/map'
import { sketchService } from '@/api/sketch-service'
import { useParams } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useIcon } from '@/hooks/use-icon'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'

export const NodeEditorModal: React.FC = () => {
  const currentNode = useGraphStore((state) => state.currentNode)
  const openNodeEditorModal = useGraphStore((state) => state.openNodeEditorModal)
  const setOpenNodeEditorModal = useGraphStore((state) => state.setOpenNodeEditorModal)
  const updateNode = useGraphStore((state) => state.updateNode)
  const setCurrentNode = useGraphStore((state) => state.setCurrentNode)
  const { id: sketchId } = useParams({ strict: false })
  const IconComponent = useIcon(
    currentNode?.data.type as string,
    currentNode?.data?.src as string | null
  )

  const [formData, setFormData] = useState<Partial<NodeData>>({
    label: '',
    caption: '',
    type: ''
  })

  const [isSaving, setIsSaving] = useState(false)

  // Update form data when currentNode changes
  useEffect(() => {
    if (currentNode) {
      setFormData({
        ...currentNode.data,
        label: currentNode.data.label || '',
        caption: currentNode.data.caption || '',
        type: currentNode.data.type || ''
      })
    }
  }, [currentNode])

  const queryClient = useQueryClient()

  // Update node mutation
  const updateNodeMutation = useMutation({
    mutationFn: async ({ sketchId, updateData }: { sketchId: string; updateData: any }) => {
      return sketchService.updateNode(sketchId, JSON.stringify(updateData))
    },
    onSuccess: (result, variables) => {
      if (result.status === 'node updated' && currentNode) {
        // Update the local store
        updateNode(currentNode.id, formData)
        setCurrentNode({
          ...currentNode,
          data: {
            ...currentNode.data,
            ...formData
          }
        })

        // Invalidate related queries
        if (sketchId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.sketches.detail(sketchId)
          })
          queryClient.invalidateQueries({
            queryKey: queryKeys.sketches.graph(sketchId, sketchId)
          })
          // Also invalidate investigation queries that might show sketch data
          queryClient.invalidateQueries({
            queryKey: queryKeys.investigations.list
          })
          queryClient.invalidateQueries({
            queryKey: queryKeys.investigations.dashboard
          })
        }

        toast.success('Node updated successfully')
        setOpenNodeEditorModal(false)
      } else {
        toast.error('Failed to update node')
      }
    },
    onError: (error) => {
      console.error('Error updating node:', error)
      toast.error('Failed to update node. Please try again.')
    }
  })

  const handleSave = async () => {
    if (!currentNode || !sketchId) return
    setIsSaving(true)

    try {
      // Prepare the data for the API
      const updateData = {
        nodeId: currentNode.id,
        data: formData
      }

      // Call the mutation
      await updateNodeMutation.mutateAsync({ sketchId, updateData })
    } catch (error) {
      console.error('Error updating node:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setOpenNodeEditorModal(false)
  }

  const handleInputChange = (field: keyof NodeData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const isLocation =
    currentNode?.data.type === 'location' ||
    (currentNode?.data.latitude && currentNode?.data.longitude)

  if (!currentNode) return null

  // Separate core fields from additional properties
  const coreFields = ['label', 'caption', 'type', 'id']
  const additionalFields = Object.entries(currentNode.data).filter(
    ([key]) => !coreFields.includes(key) && key !== 'ID'
  )

  return (
    <Sheet open={openNodeEditorModal} onOpenChange={setOpenNodeEditorModal}>
      <SheetContent className="!w-full !max-w-2xl h-full !duration-100 p-0 flex flex-col h-full">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Edit3 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex gap-3">
                <SheetTitle className="text-lg font-semibold">Edit Node Properties</SheetTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentNode.data.label || currentNode.id}
                </p>
                <Badge variant="outline" className="text-xs">
                  {currentNode.data.type || 'Unknown Type'}
                </Badge>
              </div>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 px-6 py-6 grow overflow-y-auto">
            <div className="space-y-6">
              {/* Preview Section */}
              <div className="p-4 rounded-lg bg-background border">
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {currentNode.data.src ? (
                      <Avatar className="rounded-lg h-16 w-16 border-2 border-muted">
                        <AvatarImage
                          className="rounded-lg object-cover"
                          src={currentNode.data.src}
                        />
                        <AvatarFallback className="text-lg font-semibold rounded-lg">
                          {formData.label?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-16 w-16 rounded-lg border-2 border-muted bg-muted/30 flex items-center justify-center">
                        <IconComponent className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {formData.label || 'No label'}
                    </h3>
                    <p className="text-sm font-medium text-primary">{formData.type || 'No type'}</p>
                  </div>
                </div>
              </div>

              {/* Core Properties */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Core Properties</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="label" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      Label
                    </Label>
                    <Input
                      id="label"
                      value={formData.label || ''}
                      onChange={(e) => handleInputChange('label', e.target.value)}
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
                      value={formData.type || ''}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      placeholder="Enter node type"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="caption"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <FileText className="h-3 w-3" />
                      Caption
                    </Label>
                    <Input
                      id="caption"
                      value={formData.caption || ''}
                      onChange={(e) => handleInputChange('caption', e.target.value)}
                      placeholder="Enter node caption"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Properties */}
              {additionalFields.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Additional Properties
                  </h3>
                  <div className="space-y-4">
                    {additionalFields.map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key} className="text-sm font-medium capitalize">
                          {key.replace(/_/g, ' ')}
                        </Label>
                        {typeof value === 'boolean' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant={formData[key as keyof NodeData] ? 'default' : 'outline'}
                              size="sm"
                              onClick={() =>
                                handleInputChange(
                                  key as keyof NodeData,
                                  (!formData[key as keyof NodeData]).toString()
                                )
                              }
                              className="gap-2"
                            >
                              {formData[key as keyof NodeData] ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  True
                                </>
                              ) : (
                                'False'
                              )}
                            </Button>
                          </div>
                        ) : typeof value === 'string' && value.length > 100 ? (
                          <Textarea
                            id={key}
                            value={(formData[key as keyof NodeData] as string) || ''}
                            onChange={(e) =>
                              handleInputChange(key as keyof NodeData, e.target.value)
                            }
                            placeholder={`Enter ${key.replace(/_/g, ' ').toLowerCase()}`}
                            className="min-h-[80px] resize-none"
                            rows={3}
                          />
                        ) : (
                          <Input
                            id={key}
                            value={(formData[key as keyof NodeData] as string) || ''}
                            onChange={(e) =>
                              handleInputChange(key as keyof NodeData, e.target.value)
                            }
                            placeholder={`Enter ${key.replace(/_/g, ' ').toLowerCase()}`}
                            className="h-9"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Location Map */}
              {isLocation && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                  <div className="overflow-hidden rounded-lg bg-background border">
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
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <SheetFooter className="px-6 py-4 border-t bg-muted/30 flex-shrink-0">
            <div className="flex justify-between items-center w-full">
              <div className="text-sm text-muted-foreground">
                {additionalFields.length} additional properties
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel} className="gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
