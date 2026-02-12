import { createFileRoute, useRouterState, redirect } from '@tanstack/react-router'
import { TemplateEditor } from '@/components/templates/template-editor'
const FEATURE_FLAG = true

export const Route = createFileRoute('/_auth/dashboard/enrichers/new')({
  beforeLoad: async () => {
    if (FEATURE_FLAG) {
      throw redirect({
        to: '/'
      })
    }
  },
  component: NewTemplatePage
})

function NewTemplatePage() {
  const routerState = useRouterState()
  const importedContent = (routerState.location.state as { importedContent?: string })
    ?.importedContent

  return <TemplateEditor importedYaml={importedContent} />
}
