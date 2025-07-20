import { createFileRoute } from '@tanstack/react-router'
import { transformService } from '@/api/transfrom-service'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PlusIcon, FileCode2, Clock, FileX } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { SkeletonList } from '@/components/shared/skeleton-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NewTransform from '@/components/transforms/new-transform'

interface Transform {
    id: string
    name: string
    description?: string
    category?: string[]
    created_at: string
    updated_at?: string
    transform_schema?: any
}

export const Route = createFileRoute('/_auth/dashboard/transforms/')({
    component: TransformsPage,
})

function TransformsPage() {
    const navigate = useNavigate()
    const { data: transforms, isLoading } = useQuery<Transform[]>({
        queryKey: ["transforms"],
        queryFn: () => transformService.get(),
    })

    // Get all unique categories
    const categories = transforms?.reduce((acc: string[], transform) => {
        if (transform.category) {
            transform.category.forEach(cat => {
                if (!acc.includes(cat)) acc.push(cat)
            })
        }
        return acc
    }, []) || []

    // Add "All" and "Uncategorized" to categories
    const allCategories = ['All', ...categories, 'Uncategorized']

    return (
        <div className="h-full w-full overflow-y-auto bg-background">
            <div className="bg-gradient-to-r from-secondary/10 to-primary/10 border-b border-border z-10">
                <div className="max-w-7xl mx-auto p-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold text-foreground">Flows</h1>
                            <p className="text-muted-foreground">
                                Create and manage your transform flows.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <NewTransform>
                                <Button size="sm">
                                    <PlusIcon className="w-4 h-4 mr-2" />
                                    New flow
                                </Button>
                            </NewTransform>
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto p-8 space-y-8">
                {isLoading ? (
                    <div className="p-2">
                        <SkeletonList rowCount={6} mode="card" />
                    </div>
                ) : !transforms?.length ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="rounded-full bg-muted/50 p-4 mb-4">
                            <FileX className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No transforms yet</h3>
                        <p className="text-muted-foreground mb-6 max-w-md">
                            Get started by creating your first transform. You can use transforms to process and manipulate your data in powerful ways.
                        </p>
                        <NewTransform>
                            <Button>
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Create your first transform
                            </Button>
                        </NewTransform>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {transforms
                                        ?.filter(transform =>
                                            category === 'All'
                                                ? true
                                                : category === 'Uncategorized'
                                                    ? !transform.category?.length
                                                    : transform.category?.includes(category)
                                        )
                                        .map((transform) => (
                                            <Card
                                                key={transform.id}
                                                className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                                                onClick={() => navigate({ to: `/dashboard/transforms/${transform.id}` })}
                                            >
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-start justify-between">
                                                        <CardTitle className="text-lg font-medium group-hover:text-primary transition-colors">
                                                            {transform.name || "(Unnamed transform)"}
                                                        </CardTitle>
                                                        <FileCode2 className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                    <CardDescription className="line-clamp-2 mt-1">
                                                        {transform.description || "No description provided"}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center text-sm text-muted-foreground">
                                                            <Clock className="w-4 h-4 mr-1" />
                                                            {formatDistanceToNow(new Date(transform.updated_at || transform.created_at), { addSuffix: true })}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 justify-end">
                                                            {transform.category?.map((cat) => (
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
        </div >
    )
}