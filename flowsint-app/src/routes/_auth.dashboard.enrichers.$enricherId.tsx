import { createFileRoute } from '@tanstack/react-router'
import Loader from '@/components/loader'
import { templateService } from '@/api/template-service'
import { TemplateEditor } from '@/components/templates/template-editor'

export const Route = createFileRoute('/_auth/dashboard/enrichers/$enricherId')({
  loader: async ({ params: { enricherId } }) => {
    const template = await templateService.getById(enricherId)
    return { template }
  },
  component: TemplatePage,
  pendingComponent: () => (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader />
        <p className="text-muted-foreground">Loading template...</p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-destructive mb-2">Error loading template</h2>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    </div>
  )
})

function TemplatePage() {
  const { template } = Route.useLoaderData()
  return (
    <TemplateEditor
      key={template.id}
      templateId={template.id}
      initialContent={template.content}
    />
  )
}
