import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import '@/styles.css'
import { useTheme } from '@/components/theme-provider'

export interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => {
    const { theme } = useTheme()
    return (
      <>
        <Toaster theme={theme} richColors />
        <Outlet />
      </>
    )
  },
})
