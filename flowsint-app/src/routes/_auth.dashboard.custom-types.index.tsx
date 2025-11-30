import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PlusIcon, Clock, FileX, Trash2, Edit } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { SkeletonList } from '@/components/shared/skeleton-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { customTypeService, CustomType } from '@/api/custom-type-service'
import ErrorState from '@/components/shared/error-state'
import { toast } from 'sonner'
import { useConfirm } from '@/components/use-confirm-dialog'
import { PageLayout } from '@/components/layout/page-layout'

export const Route = createFileRoute('/_auth/dashboard/custom-types/')({
  component: CustomTypesPage
})

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    draft: 'outline',
    published: 'default',
    archived: 'secondary'
  }
  return (
    <Badge variant={variants[status] || 'default'}>
      {status}
    </Badge>
  )
}

function CustomTypesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirm } = useConfirm()
  const {
    data: customTypes,
    isLoading,
    error,
    refetch
  } = useQuery<CustomType[]>({
    queryKey: ['custom-types'],
    queryFn: () => customTypeService.list()
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customTypeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-types'] })
      toast.success('Custom type deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete custom type: ${error.message}`)
    }
  })

  const confirmDelete = (customType: CustomType) => {
    deleteMutation.mutate(customType.id)

  }
  const handleDelete = async (customType: CustomType) => {
    if (await confirm({ title: "Are you sure you want to delete this custom type ?", message: "this action is irreversible." }))
      confirmDelete(customType)
  }



  // Group by status
  const draftTypes = customTypes?.filter((t) => t.status === 'draft') || []
  const publishedTypes = customTypes?.filter((t) => t.status === 'published') || []
  const archivedTypes = customTypes?.filter((t) => t.status === 'archived') || []

  return (
    <PageLayout
      title="Custom types"
      description="Create and manage your custom data types."
      isLoading={isLoading}
      loadingComponent={
        <div className="p-2">
          <SkeletonList rowCount={6} mode="card" />
        </div>
      }
      error={error}
      errorComponent={
        <ErrorState
          title="Couldn't load custom types"
          description="Something went wrong while fetching data. Please try again."
          error={error}
          onRetry={() => refetch()}
        />
      }
      actions={
        <Button
          size="sm"
          // @ts-ignore
          onClick={() => navigate({ to: '/dashboard/custom-types/new' })}
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          New custom type
        </Button>
      }
    >
      {!customTypes?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              <FileX className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No custom types yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Get started by creating your first custom type. Custom types allow you to define
              your own data structures for use in flows and investigations.
            </p>
            <Button onClick={() => navigate({
              // @ts-ignore
              to: '/dashboard/custom-types/new'
            })}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create your first custom type
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({customTypes.length})</TabsTrigger>
              <TabsTrigger value="published">Published ({publishedTypes.length})</TabsTrigger>
              <TabsTrigger value="draft">Drafts ({draftTypes.length})</TabsTrigger>
              <TabsTrigger value="archived">Archived ({archivedTypes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <CustomTypesList types={customTypes} onDelete={handleDelete} navigate={navigate} />
            </TabsContent>

            <TabsContent value="published" className="mt-6">
              <CustomTypesList types={publishedTypes} onDelete={handleDelete} navigate={navigate} />
            </TabsContent>

            <TabsContent value="draft" className="mt-6">
              <CustomTypesList types={draftTypes} onDelete={handleDelete} navigate={navigate} />
            </TabsContent>

            <TabsContent value="archived" className="mt-6">
              <CustomTypesList types={archivedTypes} onDelete={handleDelete} navigate={navigate} />
            </TabsContent>
          </Tabs>
        )}
    </PageLayout>
  )
}

interface CustomTypesListProps {
  types: CustomType[]
  onDelete: (type: CustomType) => void
  navigate: any
}

function CustomTypesList({ types, onDelete, navigate }: CustomTypesListProps) {
  if (types.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileX className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No custom types in this category</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {types.map((customType) => (
        <Card key={customType.id} className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <CardTitle className="text-lg">{customType.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {customType.description || 'No description'}
                </CardDescription>
              </div>
              {getStatusBadge(customType.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="w-4 h-4" />
              <span>
                Updated {formatDistanceToNow(new Date(customType.updated_at), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => navigate({ to: `/dashboard/custom-types/${customType.id}` })}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(customType)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
