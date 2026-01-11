import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import '@/styles.css'
import { useTheme } from '@/components/theme-provider'
import { TutorialProvider } from '@/components/tutorial/tutorial-provider'

export interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => {
    const { theme } = useTheme()
    return (
      <TutorialProvider>
        <Toaster offset={{ top: '90px' }} theme={theme} position="top-center" />
        <Outlet />
      </TutorialProvider>
    )
  }
})
