import React from 'react'

interface PageLayoutProps {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  isLoading?: boolean
  loadingComponent?: React.ReactNode
  error?: Error | null
  errorComponent?: React.ReactNode
}

export function PageLayout({
  title,
  description,
  actions,
  children,
  isLoading,
  loadingComponent,
  error,
  errorComponent
}: PageLayoutProps) {
  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="border-b border-border z-10">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {description && <p className="text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {isLoading ? loadingComponent : error ? errorComponent : children}
      </div>
    </div>
  )
}
