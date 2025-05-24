import { createFileRoute } from '@tanstack/react-router'
import Editor from '@/components/transforms/editor'

export const Route = createFileRoute('/_auth/dashboard/transforms')({
    component: TranformsPage,
})


function TranformsPage() {
    return (
        <Editor />
    )
}