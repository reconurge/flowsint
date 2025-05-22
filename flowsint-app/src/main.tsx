// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { Provider as TanStackQueryProvider, getContext as getQueryContext } from './integrations/tanstack-query/root-provider.tsx'
import { routeTree } from './routeTree.gen'
import './styles.css'
import { ThemeProvider } from './components/theme-provider.tsx'


const router = createRouter({
  routeTree,
  context: {
    ...getQueryContext(),
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)

  root.render(
    <React.StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <TanStackQueryProvider>
          <RouterProvider router={router} />
        </TanStackQueryProvider>
      </ThemeProvider>
    </React.StrictMode>
  )
}
