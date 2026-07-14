import { Plus, LayoutGrid, List, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NewInvestigation from '@/components/investigations/new-investigation'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'

interface DashboardHeaderProps {
  view: 'grid' | 'list'
  setView: (view: 'grid' | 'list') => void
  search: string
  setSearch: (val: string) => void
}

export function DashboardHeader({ view, setView, search, setSearch }: DashboardHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('dashboard.description')}
          </p>
        </div>
        <NewInvestigation noDropDown>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t('dashboard.newInvestigation')}
          </Button>
        </NewInvestigation>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder={t('dashboard.searchPlaceholder')}
            className="w-72 h-9 pl-9 pr-3 text-sm bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-md">
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded transition-colors ${
              view === 'list'
                ? 'bg-background text-foreground border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded transition-colors ${
              view === 'grid'
                ? 'bg-background text-foreground border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
