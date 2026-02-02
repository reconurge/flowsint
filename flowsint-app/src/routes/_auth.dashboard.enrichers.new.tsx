import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { TemplateEditor } from '@/components/templates/template-editor'

export const Route = createFileRoute('/_auth/dashboard/enrichers/new')({
  component: NewTemplatePage
})

function NewTemplatePage() {
  const routerState = useRouterState()
  const importedContent = (routerState.location.state as { importedContent?: string })?.importedContent

  return <TemplateEditor importedYaml={importedContent} />
}
