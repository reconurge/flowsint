import { Button } from '@/components/ui/button'
import { Plus, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface GraphEmptyStateProps {
  onOpenAddDialog: () => void
  onOpenImportDialog: () => void
  className?: string
  style?: React.CSSProperties
}

export const GraphEmptyState: React.FC<GraphEmptyStateProps> = ({
  onOpenAddDialog,
  onOpenImportDialog,
  className = '',
  style
}) => {
  const { t } = useTranslation()
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={style}
    >
      <div className="text-center text-muted-foreground max-w-md mx-auto p-6">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-muted-foreground/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{t('sketches.emptyState.title', { defaultValue: 'No data to visualize' })}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('sketches.emptyState.subtitle', { defaultValue: 'Start your investigation by adding nodes to see them displayed in the graph view.' })}
        </p>
        <div className="space-y-2 text-xs text-muted-foreground mb-6">
          <p>
            <strong>{t('sketches.emptyState.tipTitle', { defaultValue: 'Tip:' })}</strong> {t('sketches.emptyState.tipText', { defaultValue: 'Use the search bar to find entities or import data to get started' })}
          </p>
          <p>
            <strong>{t('sketches.emptyState.exploreTitle', { defaultValue: 'Explore:' })}</strong> {t('sketches.emptyState.exploreText', { defaultValue: 'Try searching for domains, emails, or other entities' })}
          </p>
          <p>
            <strong>{t('sketches.emptyState.labelsTitle', { defaultValue: 'Labels:' })}</strong> {t('sketches.emptyState.labelsText', { defaultValue: 'Zoom in (over 2x) to see all labels, icons, and edges' })}
          </p>
        </div>
        <div className='flex flex-col justify-center gap-1'>
          <Button onClick={onOpenAddDialog}>
            <Plus />
            {t('sketches.emptyState.addFirst', { defaultValue: 'Add your first item' })}
          </Button>
          <span className='opacity-60'>{t('sketches.emptyState.or', { defaultValue: 'or' })}</span>
          <Button variant="secondary" onClick={onOpenImportDialog}>
            <Upload /> {t('sketches.emptyState.importData', { defaultValue: 'Import data' })}
          </Button>
        </div>
      </div>
    </div >
  )
}
