import { useCallback, useState, memo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger
} from '@/components/ui/sheet'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useLaunchTransform } from '@/hooks/use-launch-transform'
import { useLaunchFlow } from '@/hooks/use-launch-flow'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { transformService } from '@/api/transform-service'
import { flowService } from '@/api/flow-service'
import { Link, useParams } from '@tanstack/react-router'
import { capitalizeFirstLetter } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, FileCode2, Zap, PlusIcon, GitBranch, FileX, Sparkles } from 'lucide-react'
import { Transform, Flow } from '@/types'

const LaunchTransformOrFlowPanel = memo(
  ({ values, type, children, disabled }: { values: string[]; type: string; children?: React.ReactNode, disabled?: boolean }) => {
    const { launchTransform } = useLaunchTransform()
    const { launchFlow } = useLaunchFlow()
    const { id: sketch_id } = useParams({ strict: false })
    const [isOpen, setIsOpen] = useState(false)
    const [selectedTransform, setSelectedTransform] = useState<Transform | Flow | null>(null)
    const [activeTab, setActiveTab] = useState('transforms')
    const [transformsSearchQuery, setTransformsSearchQuery] = useState('')
    const [flowsSearchQuery, setFlowsSearchQuery] = useState('')

    const { data: transforms, isLoading: isLoadingTransforms } = useQuery({
      queryKey: ['transforms', type],
      queryFn: () => transformService.get(capitalizeFirstLetter(type))
    })

    const { data: flows, isLoading: isLoadingFlows } = useQuery({
      queryKey: ['flows', type],
      queryFn: () => flowService.get(capitalizeFirstLetter(type))
    })

    const filteredTransforms =
      transforms?.filter((transform: Transform) => {
        if (!transformsSearchQuery.trim()) return true
        const query = transformsSearchQuery.toLowerCase().trim()
        const matchesName = transform.name?.toLowerCase().includes(query)
        const matchesDescription = transform.description?.toLowerCase().includes(query)
        return matchesName || matchesDescription
      }) || []

    const filteredFlows =
      flows?.filter((transform: Flow) => {
        if (!flowsSearchQuery.trim()) return true
        const query = flowsSearchQuery.toLowerCase().trim()
        const matchesName = transform.name?.toLowerCase().includes(query)
        const matchesDescription = transform.description?.toLowerCase().includes(query)
        return matchesName || matchesDescription
      }) || []

    const handleCloseModal = useCallback(() => {
      setIsOpen(false)
    }, [])

    const handleSelectTransform = useCallback((transform: Transform | Flow) => {
      setSelectedTransform(transform)
    }, [])

    const handleLaunchPanel = useCallback(() => {
      if (selectedTransform) {
        // Check if it's a Transform or Flow based on the active tab
        if (activeTab === 'transforms') {
          // For transforms, use name
          launchTransform(values, (selectedTransform as Transform).name, sketch_id)
        } else {
          // For flows, use id
          launchFlow(values, (selectedTransform as Flow).id, sketch_id)
        }
        handleCloseModal()
      }
    }, [selectedTransform, activeTab, launchTransform, launchFlow, values, sketch_id])

    if (disabled) return (
      <>{children}</>
    )
    return (
      <div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger disabled={disabled} asChild>
            <div>{children}</div>
          </SheetTrigger>
          <SheetContent className="sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Select a transform</SheetTitle>
              <SheetDescription>Choose a transform to launch from the list below.</SheetDescription>
            </SheetHeader>

            {/* Tabs */}
            <div className="px-4 py-2 border-b border-border">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger
                    value="transforms"
                    className="flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Transforms
                  </TabsTrigger>
                  <TabsTrigger
                    value="flows"
                    className="flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileCode2 className="h-3 w-3 mr-1" />
                    Flows
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Tab Content */}
            <Tabs value={activeTab} className="flex-1 flex flex-col min-h-0">
              {/* Transforms Tab */}
              <TabsContent value="transforms" className="flex-1 flex flex-col min-h-0 mt-0">
                {/* Transforms Search */}
                <div className="px-4 py-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search transforms..."
                      value={transformsSearchQuery}
                      onChange={(e) => setTransformsSearchQuery(e.target.value)}
                      className="h-8 pl-7 text-sm"
                    />
                  </div>
                </div>

                {/* Transforms List */}
                <div className="p-4 grow overflow-auto">
                  <RadioGroup
                    value={
                      selectedTransform && 'name' in selectedTransform
                        ? selectedTransform.name
                        : undefined
                    }
                    className="space-y-3"
                  >
                    {isLoadingTransforms ? (
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
                    ) : filteredTransforms.length > 0 ? (
                      filteredTransforms.map((transform: Transform) => (
                        <Card
                          key={transform.name}
                          className={`cursor-pointer border py-1 transition-all ${selectedTransform &&
                            'name' in selectedTransform &&
                            selectedTransform.name === transform.name
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                            }`}
                          onClick={() => handleSelectTransform(transform)}
                        >
                          <CardHeader className="p-4">
                            <div className="flex flex-col space-y-4">
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value={transform.name} id={transform.name} />
                                <CardTitle className="text-base">{transform.name}</CardTitle>
                              </div>

                              {transform.description && (
                                <CardDescription className="text-sm pl-7">
                                  {transform.description || 'No description available'}
                                </CardDescription>
                              )}
                            </div>
                          </CardHeader>
                        </Card>
                      ))
                    ) : (
                      <div className="p-8 text-center space-y-6">
                        <div className="flex justify-center">
                          <div className="p-4 rounded-full bg-muted/50">
                            {transformsSearchQuery ? (
                              <FileX className="h-8 w-8 text-muted-foreground" />
                            ) : (
                              <FileCode2 className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">
                            {transformsSearchQuery
                              ? 'No transforms found'
                              : 'No transforms available'}
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            {transformsSearchQuery
                              ? 'Try adjusting your search terms or browse all available transforms.'
                              : 'Transforms are automated data processing tools that can enrich your investigation data.'}
                          </p>
                        </div>
                        {!transformsSearchQuery && (
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Sparkles className="h-3 w-3" />
                            <span>Transforms will appear here when available</span>
                          </div>
                        )}
                      </div>
                    )}
                  </RadioGroup>
                </div>
              </TabsContent>

              {/* Flows Tab */}
              <TabsContent value="flows" className="flex-1 flex flex-col min-h-0 mt-0">
                {/* Flows Search */}
                <div className="px-4 py-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search flows..."
                      value={flowsSearchQuery}
                      onChange={(e) => setFlowsSearchQuery(e.target.value)}
                      className="h-8 pl-7 text-sm"
                    />
                  </div>
                </div>

                {/* Flows List */}
                <div className="p-4 grow overflow-auto">
                  <RadioGroup
                    value={
                      selectedTransform && 'id' in selectedTransform
                        ? selectedTransform.id
                        : undefined
                    }
                    className="space-y-3"
                  >
                    {isLoadingFlows ? (
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
                    ) : filteredFlows.length > 0 ? (
                      filteredFlows.map((flow: Flow) => (
                        <Card
                          key={flow.id}
                          className={`cursor-pointer border py-1 transition-all ${selectedTransform &&
                            'id' in selectedTransform &&
                            selectedTransform.id === flow.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                            }`}
                          onClick={() => handleSelectTransform(flow)}
                        >
                          <CardHeader className="p-4">
                            <div className="flex flex-col space-y-4">
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value={flow.id} id={flow.id} />
                                <CardTitle className="text-base">{flow.name}</CardTitle>
                              </div>

                              {flow.description && (
                                <CardDescription className="text-sm pl-7">
                                  {flow.description || 'No description available'}
                                </CardDescription>
                              )}

                              <div className="flex flex-col space-y-1 text-xs text-muted-foreground pl-7">
                                <div>
                                  Created{' '}
                                  {formatDistanceToNow(flow.created_at, { addSuffix: true })}
                                </div>
                                <div>
                                  Updated{' '}
                                  {formatDistanceToNow(flow.last_updated_at, { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))
                    ) : (
                      <div className="p-8 text-center space-y-6">
                        <div className="flex justify-center">
                          <div className="p-4 rounded-full bg-muted/50">
                            {flowsSearchQuery ? (
                              <FileX className="h-8 w-8 text-muted-foreground" />
                            ) : (
                              <GitBranch className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">
                            {flowsSearchQuery ? 'No flows found' : 'No flows available'}
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            {flowsSearchQuery
                              ? 'Try adjusting your search terms or browse all available flows.'
                              : 'Flows are custom automation sequences that combine multiple transforms and data sources.'}
                          </p>
                        </div>
                        {!flowsSearchQuery && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                              <Zap className="h-3 w-3" />
                              <span>Create your first flow to get started</span>
                            </div>
                            <Link to="/dashboard/flows">
                              <Button className="gap-2">
                                <PlusIcon className="h-4 w-4" />
                                Create your first flow
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </RadioGroup>
                </div>
              </TabsContent>
            </Tabs>

            <SheetFooter>
              <Button variant="outline" onClick={handleCloseModal} className="mr-2">
                Cancel
              </Button>
              <Button
                onClick={handleLaunchPanel}
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
)

export default LaunchTransformOrFlowPanel
