import FloatingChat from '@/components/chat/floating-chat'
import RootLayout from '@/components/layout/root.layout'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/dashboard')({
  component: DashboardPage
})

function DashboardPage() {
  const settings = useGraphSettingsStore((s) => s.settings)
  return (
    <RootLayout>
      <Outlet />
      {Boolean(settings?.general?.showFlow?.value) && <FloatingChat />}
    </RootLayout>
  )
}
