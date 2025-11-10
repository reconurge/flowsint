import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PlusIcon, FileCode2, Clock, FileX } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { SkeletonList } from '@/components/shared/skeleton-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NewFlow from '@/components/flows/new-flow'
import { flowService } from '@/api/flow-service'
import ErrorState from '@/components/shared/error-state'
import { PageLayout } from '@/components/layout/page-layout'

interface Flow {
  id: string
  name: string
  description?: string
  category?: string[]
  created_at: string
  updated_at?: string
  flow_schema?: any
}

export const Route = createFileRoute('/_auth/dashboard/flows/')({
  component: FlowPage
})

function FlowPage() {
  const navigate = useNavigate()
  const {
    data: flows,
    isLoading,
    error,
    refetch
  } = useQuery<Flow[]>({
    queryKey: ['flow'],
    queryFn: () => flowService.get()
  })

  // Get all unique categories
  const categories =
    flows?.reduce((acc: string[], flow) => {
      if (flow.category) {
        flow.category.forEach((cat) => {
          if (!acc.includes(cat)) acc.push(cat)
        })
      }
      return acc
    }, []) || []

  // Add "All" and "Uncategorized" to categories
  const allCategories = ['All', ...categories, 'Uncategorized']

  return (
    <PageLayout
      title="Flows"
      description="Create and manage your flow flows."
      isLoading={isLoading}
      loadingComponent={
        <div className="p-2">
          <SkeletonList rowCount={6} mode="card" />
        </div>
      }
      error={error}
      errorComponent={
        <ErrorState
          title="Couldn't load flows"
          description="Something went wrong while fetching data. Please try again."
          error={error}
          onRetry={() => refetch()}
        />
      }
      actions={
        <NewFlow>
          <Button size="sm" data-tour-id="create-flow">
            <PlusIcon className="w-4 h-4 mr-2" />
            New flow
          </Button>
        </NewFlow>
      }
    >
      <div style={{ containerType: 'inline-size' }}>
        {!flows?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              <FileX className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No flow yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Get started by creating your first flow. You can use flows to process and manipulate
              your data in powerful ways.
            </p>
            <NewFlow>
              <Button>
                <PlusIcon className="w-4 h-4 mr-2" />
                Create your first flow
              </Button>
            </NewFlow>
          </div>
        ) : (
          <Tabs defaultValue="All" className="space-y-6">
            <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto hide-scrollbar">
              {allCategories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="data-[state=active]:bg-background"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            {allCategories.map((category) => (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-6" data-tour-id="flow-list">
                  {flows
                    ?.filter((flow) =>
                      category === 'All'
                        ? true
                        : category === 'Uncategorized'
                          ? !flow.category?.length
                          : flow.category?.includes(category)
                    )
                    .map((flow) => (
                      <Card
                        key={flow.id}
                        className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => navigate({ to: `/dashboard/flows/${flow.id}` })}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg font-medium group-hover:text-primary transition-colors">
                              {flow.name || '(Unnamed flow)'}
                            </CardTitle>
                            <FileCode2 className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <CardDescription className="line-clamp-2 mt-1">
                            {flow.description || 'No description provided'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatDistanceToNow(new Date(flow.updated_at || flow.created_at), {
                                addSuffix: true
                              })}
                            </div>
                            <div className="flex flex-wrap gap-2 justify-end">
                              {flow.category?.map((cat) => (
                                <Badge key={cat} variant="secondary">
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </PageLayout>
  )
}
