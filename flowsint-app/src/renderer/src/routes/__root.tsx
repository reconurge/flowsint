import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthDebug } from '@/components/auth-debug'
import '@/styles.css'

export interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <Toaster richColors />
      <Outlet />
      {/* {process.env.NODE_ENV === 'development' && <AuthDebug />} */}
    </>
  ),
})
