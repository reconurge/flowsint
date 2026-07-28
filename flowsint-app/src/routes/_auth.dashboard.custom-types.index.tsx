import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PlusIcon, Clock, FileX, Trash2, Edit } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { SkeletonList } from '@/components/shared/skeleton-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { customTypeService, CustomType } from '@/api/custom-type-service'
import ErrorState from '@/components/shared/error-state'
import { toast } from 'sonner'
import { useConfirm } from '@/components/use-confirm-dialog'
import { PageLayout } from '@/components/layout/page-layout'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_auth/dashboard/custom-types/')({
  component: CustomTypesPage
})

const getStatusBadge = (status: string, t: any) => {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    draft: 'outline',
    published: 'default',
    archived: 'secondary'
  }
  return (
    <Badge variant={variants[status] || 'default'}>
      {t(`customTypes.status.${status}`, { defaultValue: status })}
    </Badge>
  )
}

function CustomTypesPage() {
  const { t } = useTranslation()
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
      queryClient.invalidateQueries({ queryKey: ['actionItems'] })
      toast.success(t('customTypes.toast.deleted'))
    },
    onError: (error: Error) => {
      toast.error(t('customTypes.toast.deleteFailed') + error.message)
    }
  })

  const confirmDelete = (customType: CustomType) => {
    deleteMutation.mutate(customType.id)

  }
  const handleDelete = async (customType: CustomType) => {
    if (await confirm({ title: t('customTypes.deleteConfirm.title'), message: t('customTypes.deleteConfirm.message') }))
      confirmDelete(customType)
  }



  // Group by status
  const draftTypes = customTypes?.filter((t) => t.status === 'draft') || []
  const publishedTypes = customTypes?.filter((t) => t.status === 'published') || []
  const archivedTypes = customTypes?.filter((t) => t.status === 'archived') || []

  return (
    <PageLayout
      title={t('customTypes.title')}
      description={t('customTypes.description')}
      isLoading={isLoading}
      loadingComponent={
        <div className="p-2">
          <SkeletonList rowCount={6} mode="card" />
        </div>
      }
      error={error}
      errorComponent={
        <ErrorState
          title={t('customTypes.errorTitle')}
          description={t('common.errorDesc')}
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
          {t('customTypes.newCustomType')}
        </Button>
      }
    >
      {!customTypes?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              <FileX className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('customTypes.noCustomTypes')}</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t('customTypes.noCustomTypesDesc')}
            </p>
            <Button onClick={() => navigate({
              // @ts-ignore
              to: '/dashboard/custom-types/new'
            })}>
              <PlusIcon className="w-4 h-4 mr-2" />
              {t('customTypes.createFirst')}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">{t('customTypes.tabs.all')} ({customTypes.length})</TabsTrigger>
              <TabsTrigger value="published">{t('customTypes.tabs.published')} ({publishedTypes.length})</TabsTrigger>
              <TabsTrigger value="draft">{t('customTypes.tabs.drafts')} ({draftTypes.length})</TabsTrigger>
              <TabsTrigger value="archived">{t('customTypes.tabs.archived')} ({archivedTypes.length})</TabsTrigger>
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
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ru' ? ru : enUS

  if (types.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileX className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t('customTypes.noInCategory')}</p>
      </div>
    )
  }

  return (
    <div style={{ containerType: 'inline-size' }}>
    <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 gap-4">
      {types.map((customType) => (
        <Card key={customType.id} className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <CardTitle className="text-lg">{customType.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {customType.description || t('customTypes.noDescription')}
                </CardDescription>
              </div>
              {getStatusBadge(customType.status, t)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="w-4 h-4" />
              <span>
                {t('customTypes.updated')} {formatDistanceToNow(new Date(customType.updated_at), { addSuffix: true, locale })}
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
                {t('customTypes.edit')}
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
    </div>
  )
}
