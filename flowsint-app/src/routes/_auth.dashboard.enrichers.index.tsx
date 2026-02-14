import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlusIcon, FileCode2, Clock, FileX, Upload, FlaskConical, X } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { SkeletonList } from '@/components/shared/skeleton-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ErrorState from '@/components/shared/error-state'
import { PageLayout } from '@/components/layout/page-layout'
import { templateService, type Template } from '@/api/template-service'
import { CONFIG } from '@/config'

export const Route = createFileRoute('/_auth/dashboard/enrichers/')({
  beforeLoad: async () => {
    if (!CONFIG.ENRICHER_TEMPLATES_FEATURE_FLAG) {
      throw redirect({
        to: '/'
      })
    }
  },
  component: TemplatesPage
})

function TemplatesPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false)

  const dismissBanner = () => {
    setIsBannerDismissed(true)
  }

  const {
    data: templates,
    isLoading,
    error,
    refetch
  } = useQuery<Template[]>({
    queryKey: ['template', 'enrichers'],
    queryFn: () => templateService.getAll()
  })

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
      toast.error('Only YAML files (.yaml, .yml) are supported')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      navigate({
        to: '/dashboard/enrichers/new' as string,
        state: { importedContent: content }
      })
    }
    reader.onerror = () => {
      toast.error('Failed to read file')
    }
    reader.readAsText(file)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Get all unique categories
  const categories =
    templates?.reduce((acc: string[], template) => {
      if (template.category && !acc.includes(template.category)) {
        acc.push(template.category)
      }
      return acc
    }, []) || []

  // Add "All" to categories
  const allCategories = ['All', ...categories]

  return (
    <PageLayout
      title="Enricher Templates"
      description="Create and manage your enricher templates."
      isLoading={isLoading}
      loadingComponent={
        <div className="p-2">
          <SkeletonList rowCount={6} mode="card" />
        </div>
      }
      error={error}
      errorComponent={
        <ErrorState
          title="Couldn't load templates"
          description="Something went wrong while fetching data. Please try again."
          error={error}
          onRetry={() => refetch()}
        />
      }
      actions={
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml"
            onChange={handleImportFile}
            className="hidden"
          />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button size="sm" onClick={() => navigate({ to: '/dashboard/enrichers/new' as string })}>
            <PlusIcon className="w-4 h-4 mr-2" />
            New template
          </Button>
        </div>
      }
    >
      {!isBannerDismissed && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
          <FlaskConical className="h-4 w-4 shrink-0 text-primary" />
          <p className="flex-1 text-sm text-primary">
            Template enrichers are currently in <strong>beta</strong>. Feel free to{' '}
            <a
              href="https://github.com/reconurge/flowsint/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2"
            >
              raise an issue
            </a>{' '}
            if you encounter any problems.
          </p>
          <button
            onClick={dismissBanner}
            className="shrink-0 rounded p-1 text-primary hover:bg-primary/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div style={{ containerType: 'inline-size' }}>
        {!templates?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              <FileX className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Get started by creating your first enricher template. Templates allow you to define
              custom enrichers using YAML configuration.
            </p>
            <Button onClick={() => navigate({ to: '/dashboard/enrichers/new' as string })}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create your first template
            </Button>
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
                <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-6">
                  {templates
                    ?.filter((template) =>
                      category === 'All' ? true : template.category === category
                    )
                    .map((template) => (
                      <Card
                        key={template.id}
                        className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => navigate({ to: `/dashboard/enrichers/${template.id}` })}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg font-medium group-hover:text-primary transition-colors">
                              {template.name || '(Unnamed template)'}
                            </CardTitle>
                            <Badge variant="outline">
                              <FileCode2 className="w-4 h-4 text-muted-foreground" />v
                              {template.version}
                            </Badge>
                          </div>
                          <CardDescription className="line-clamp-2 mt-1">
                            {template.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatDistanceToNow(
                                new Date(template.updated_at || template.created_at),
                                { addSuffix: true }
                              )}
                            </div>
                            <Badge variant="secondary">{template.category}</Badge>
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
